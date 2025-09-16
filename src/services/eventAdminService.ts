import { z } from 'zod';
import { supabase } from '../lib/supabase-client';
import { CATEGORIES } from '../constants/categories';

const CATEGORY_ID_SET = new Set(CATEGORIES.map(category => category.id));

export const ADMIN_EVENT_CURRENCIES = ['GHS', 'USD', 'EUR', 'NGN'] as const;
export const ADMIN_EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as const;

const baseString = z.string({ required_error: 'Field is required' }).trim();

const MAX_EVENT_PRICE = 1_000_000;
const MAX_TICKET_PRICE = 1_000_000;
const MAX_TICKET_QUANTITY = 1_000_000;
const MAX_EVENT_CAPACITY = 1_000_000;

const HTTPS_PROTOCOL = 'https://';

const finiteMoney = (minimumMessage: string, invalidMessage: string, maxMessage: string, maxValue: number) =>
  z
    .number()
    .finite({ message: invalidMessage })
    .min(0, minimumMessage)
    .max(maxValue, maxMessage);

const boundedInteger = (
  minimum: number,
  minimumMessage: string,
  maxMessage: string,
  wholeNumberMessage: string,
) =>
  z
    .number()
    .int({ message: wholeNumberMessage })
    .min(minimum, minimumMessage)
    .max(MAX_TICKET_QUANTITY, maxMessage);

export const adminTicketTypeSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: baseString.min(1, 'Ticket name is required').max(120, 'Ticket name is too long'),
    description: baseString.min(1, 'Ticket description is required'),
    price: finiteMoney(
      'Ticket price cannot be negative',
      'Ticket price must be a valid amount',
      'Ticket price exceeds supported limits',
      MAX_TICKET_PRICE,
    ),
    quantity: boundedInteger(
      0,
      'Ticket quantity cannot be negative',
      'Ticket quantity exceeds supported limits',
      'Ticket quantity must be a whole number',
    ),
    available: boundedInteger(
      0,
      'Available tickets cannot be negative',
      'Available tickets exceed supported limits',
      'Available tickets must be a whole number',
    ),
    max_per_order: boundedInteger(
      1,
      'Max per order must be at least 1',
      'Max per order exceeds supported limits',
      'Max per order must be a whole number',
    ),
  })
  .superRefine((ticket, ctx) => {
    if (ticket.available > ticket.quantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['available'],
        message: 'Available tickets cannot exceed total quantity',
      });
    }

    if (ticket.max_per_order > ticket.quantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_per_order'],
        message: 'Max per order cannot exceed total quantity',
      });
    }
  });

const categoriesSchema = z
  .array(baseString.min(1))
  .optional()
  .transform(values => {
    if (!values) {
      return [] as string[];
    }

    const unique: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      if (!seen.has(value)) {
        unique.push(value);
        seen.add(value);
      }
    }

    return unique;
  })
  .superRefine((values, ctx) => {
    values.forEach((value, index) => {
      if (!CATEGORY_ID_SET.has(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Unknown category: ${value}`,
        });
      }
    });
  });

export const adminEventSchema = z.object({
  title: baseString.min(1, 'Title is required').max(180, 'Title is too long'),
  description: baseString.min(1, 'Description is required'),
  date: baseString.regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'Invalid date format (expected YYYY-MM-DD)'),
  time: baseString.regex(/^[0-9]{2}:[0-9]{2}$/u, 'Invalid time format (expected HH:MM)'),
  location: baseString.min(1, 'Location is required'),
  image_url: baseString
    .url('A valid image URL is required')
    .refine(url => url.toLowerCase().startsWith(HTTPS_PROTOCOL), 'Image URL must use HTTPS'),
  price: finiteMoney(
    'Price cannot be negative',
    'Event price must be a valid amount',
    'Event price exceeds supported limits',
    MAX_EVENT_PRICE,
  ),
  currency: z.enum(ADMIN_EVENT_CURRENCIES),
  capacity: z
    .number()
    .int({ message: 'Capacity must be a whole number' })
    .min(1, 'Capacity must be at least 1')
    .max(MAX_EVENT_CAPACITY, 'Capacity exceeds supported limits'),
  status: z.enum(ADMIN_EVENT_STATUSES).default('DRAFT'),
  featured: z.boolean().optional().default(false),
  organizer_id: z
    .string()
    .uuid({ message: 'Organizer identifier must be a valid UUID' })
    .optional()
    .nullable()
    .transform(value => value ?? null),
  categories: categoriesSchema.default([]),
  ticket_types: z.array(adminTicketTypeSchema).min(1, 'At least one ticket type is required'),
});

export type AdminTicketTypeInput = z.infer<typeof adminTicketTypeSchema>;
export type AdminEventInput = z.infer<typeof adminEventSchema>;

const clampAvailability = (ticket: AdminTicketTypeInput) => ({
  ...ticket,
  available: Math.min(ticket.available, ticket.quantity),
});

export async function createAdminEvent(input: AdminEventInput) {
  const parsed = adminEventSchema.parse(input);
  const { ticket_types, organizer_id, categories, featured = false, ...eventFields } = parsed;

  const eventPayload = {
    ...eventFields,
    featured,
    organizer_id,
    categories,
  };

  const insertBuilder = supabase
    .from('events')
    .insert([eventPayload])
    .select('id')
    .maybeSingle();

  const { data, error } = await insertBuilder;

  if (error) {
    throw new Error(error.message || 'Failed to create event');
  }

  const eventId = data?.id;

  if (!eventId) {
    throw new Error('Failed to retrieve created event identifier');
  }

  const ticketPayload = ticket_types.map(ticket => {
    const sanitized = clampAvailability(ticket);
    return {
      event_id: eventId,
      name: sanitized.name,
      description: sanitized.description,
      price: sanitized.price,
      quantity: sanitized.quantity,
      available: sanitized.available,
      max_per_order: sanitized.max_per_order,
    };
  });

  const { error: ticketError } = await supabase.from('ticket_types').insert(ticketPayload);

  if (ticketError) {
    await supabase.from('events').delete().eq('id', eventId);
    throw new Error(ticketError.message || 'Failed to create ticket types');
  }

  return eventId;
}

export async function updateAdminEvent(
  eventId: string,
  input: AdminEventInput,
  existingTicketTypeIds: string[] = [],
) {
  const parsed = adminEventSchema.parse(input);
  const { ticket_types, organizer_id, categories, featured = false, ...eventFields } = parsed;

  const { error: eventError } = await supabase
    .from('events')
    .update({
      ...eventFields,
      featured,
      organizer_id,
      categories,
    })
    .eq('id', eventId);

  if (eventError) {
    throw new Error(eventError.message || 'Failed to update event');
  }

  const sanitizedTickets = ticket_types.map(ticket => ({
    ...clampAvailability(ticket),
    event_id: eventId,
  }));

  const ticketsToUpsert = sanitizedTickets.filter(ticket => ticket.id);
  if (ticketsToUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from('ticket_types')
      .upsert(ticketsToUpsert, { onConflict: 'id' });

    if (upsertError) {
      throw new Error(upsertError.message || 'Failed to update ticket types');
    }
  }

  const ticketsToInsert = sanitizedTickets
    .filter(ticket => !ticket.id)
    .map(({ id: _id, ...ticket }) => ticket);

  if (ticketsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('ticket_types').insert(ticketsToInsert);
    if (insertError) {
      throw new Error(insertError.message || 'Failed to create new ticket types');
    }
  }

  const incomingIds = new Set(
    sanitizedTickets
      .map(ticket => ticket.id)
      .filter((id): id is string => typeof id === 'string'),
  );
  const ticketsToDelete = existingTicketTypeIds.filter(id => !incomingIds.has(id));

  if (ticketsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('ticket_types')
      .delete()
      .in('id', ticketsToDelete);

    if (deleteError) {
      throw new Error(deleteError.message || 'Failed to remove old ticket types');
    }
  }
}
