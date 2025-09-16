import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { CATEGORIES } from '../../../constants/categories';
import { useTranslation } from '../../../context/TranslationContext';
import type { Event, EventOrganizer, TicketType } from '../../../types/event';
import {
  ADMIN_EVENT_CURRENCIES,
  ADMIN_EVENT_STATUSES,
  adminEventSchema,
  createAdminEvent,
  updateAdminEvent,
} from '../../../services/eventAdminService';

interface EventFormProps {
  event: (Event & { ticket_types?: TicketType[] | null }) | null;
  organizers: EventOrganizer[];
  onSuccess: () => Promise<void> | void;
  onCancel: () => void;
}

interface TicketTypeDraft {
  id?: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  available: string;
  max_per_order: string;
}

interface FormState {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image_url: string;
  price: string;
  currency: string;
  capacity: string;
  status: string;
  featured: boolean;
  organizerId: string;
  categories: string[];
}

type FieldErrors = Record<string, string>;

const DEFAULT_CURRENCY = ADMIN_EVENT_CURRENCIES[0];
const DEFAULT_STATUS = ADMIN_EVENT_STATUSES[0];

const createEmptyTicketType = (): TicketTypeDraft => ({
  name: '',
  description: '',
  price: '',
  quantity: '',
  available: '',
  max_per_order: '1',
});

const toDecimal = (value: string): number => {
  const normalized = value.replace(/,/g, '.').trim();
  if (!normalized) return Number.NaN;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const toInteger = (value: string): number => {
  const normalized = value.trim();
  if (!normalized) return Number.NaN;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const mapTicketTypeToDraft = (ticket: TicketType): TicketTypeDraft => ({
  id: ticket.id,
  name: ticket.name ?? '',
  description: ticket.description ?? '',
  price: ticket.price != null ? String(ticket.price) : '',
  quantity: ticket.quantity != null ? String(ticket.quantity) : '',
  available: ticket.available != null ? String(ticket.available) : '',
  max_per_order: ticket.max_per_order != null ? String(ticket.max_per_order) : '1',
});

export default function EventForm({ event, organizers, onSuccess, onCancel }: EventFormProps) {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<FormState>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    image_url: '',
    price: '',
    currency: DEFAULT_CURRENCY,
    capacity: '',
    status: DEFAULT_STATUS,
    featured: false,
    organizerId: '',
    categories: [],
  });
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDraft[]>([createEmptyTicketType()]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categoryError = useMemo(() => {
    if (errors['categories']) {
      return errors['categories'];
    }

    const nestedEntry = Object.entries(errors).find(([key]) => key.startsWith('categories.'));
    return nestedEntry?.[1];
  }, [errors]);

  const existingTicketTypeIds = useMemo(
    () => event?.ticket_types?.map(ticket => ticket.id).filter((id): id is string => Boolean(id)) ?? [],
    [event?.ticket_types],
  );

  useEffect(() => {
    setFormState({
      title: event?.title ?? '',
      description: event?.description ?? '',
      date: event?.date ?? '',
      time: event?.time ?? '',
      location: event?.location ?? '',
      image_url: event?.image_url ?? '',
      price: event?.price != null ? String(event.price) : '',
      currency: event?.currency ?? DEFAULT_CURRENCY,
      capacity: event?.capacity != null ? String(event.capacity) : '',
      status: event?.status ?? DEFAULT_STATUS,
      featured: Boolean(event?.featured),
      organizerId: event?.organizer_id ?? '',
      categories: event?.categories?.slice() ?? [],
    });

    if (event?.ticket_types && event.ticket_types.length > 0) {
      setTicketTypes(event.ticket_types.map(mapTicketTypeToDraft));
    } else {
      setTicketTypes([createEmptyTicketType()]);
    }

    setErrors({});
  }, [event]);

  const updateFormState = (changes: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...changes }));
  };

  const updateTicketType = (index: number, changes: Partial<TicketTypeDraft>) => {
    setTicketTypes(prev => prev.map((ticket, currentIndex) => (currentIndex === index ? { ...ticket, ...changes } : ticket)));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormState(prev => {
      const categories = new Set(prev.categories);
      if (categories.has(categoryId)) {
        categories.delete(categoryId);
      } else {
        categories.add(categoryId);
      }

      return { ...prev, categories: Array.from(categories) };
    });
  };

  const addTicketType = () => {
    setTicketTypes(prev => [...prev, createEmptyTicketType()]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(prev => (prev.length === 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index)));
  };

  const buildPayload = () => {
    const parsedTicketTypes = ticketTypes.map(ticket => {
      const quantity = toInteger(ticket.quantity);
      const available = ticket.available.trim()
        ? toInteger(ticket.available)
        : quantity;

      return {
        id: ticket.id,
        name: ticket.name,
        description: ticket.description,
        price: toDecimal(ticket.price),
        quantity,
        available,
        max_per_order: toInteger(ticket.max_per_order),
      };
    });

    return {
      title: formState.title,
      description: formState.description,
      date: formState.date,
      time: formState.time,
      location: formState.location,
      image_url: formState.image_url,
      price: toDecimal(formState.price),
      currency: formState.currency,
      capacity: toInteger(formState.capacity),
      status: formState.status,
      featured: formState.featured,
      organizer_id: formState.organizerId || null,
      categories: formState.categories,
      ticket_types: parsedTicketTypes,
    };
  };

  const handleSubmit = async (eventObject: React.FormEvent<HTMLFormElement>) => {
    eventObject.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      const parsed = adminEventSchema.safeParse(payload);

      if (!parsed.success) {
        const nextErrors: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const pathKey = issue.path.join('.');
          if (!nextErrors[pathKey]) {
            nextErrors[pathKey] = issue.message;
          }
        }
        setErrors(nextErrors);
        toast.error(t('admin.events.error.validation', { default: 'Please correct the highlighted errors.' }));
        return;
      }

      setErrors({});

      if (event) {
        await updateAdminEvent(event.id, parsed.data, existingTicketTypeIds);
        toast.success(t('admin.events.success.update', { default: 'Event updated successfully' }));
      } else {
        await createAdminEvent(parsed.data);
        toast.success(t('admin.events.success.create', { default: 'Event created successfully' }));
      }

      await onSuccess?.();
    } catch (error) {
      console.error('Failed to save event', error);
      const message = error instanceof Error ? error.message : undefined;
      toast.error(
        message && message.trim().length > 0
          ? message
          : t('admin.events.error.save', { default: 'Failed to save event' }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getError = (path: string) => errors[path];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.title', { default: 'Title' })}
            </label>
            <input
              type="text"
              value={formState.title}
              onChange={event => updateFormState({ title: event.target.value })}
              className={`mt-1 block w-full rounded-lg border ${
                getError('title') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              } shadow-sm focus:border-indigo-500`}
              placeholder={t('admin.events.form.title_placeholder', { default: 'Enter event title' })}
            />
            {getError('title') && <p className="mt-1 text-sm text-red-600">{getError('title')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.organizer', { default: 'Organizer' })}
            </label>
            <select
              value={formState.organizerId}
              onChange={event => updateFormState({ organizerId: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">
                {t('admin.events.form.no_organizer', { default: 'No organizer assigned' })}
              </option>
              {organizers.map(organizer => (
                <option key={organizer.user_id} value={organizer.user_id}>
                  {organizer.name} — {organizer.email}
                </option>
              ))}
            </select>
            {getError('organizer_id') && <p className="mt-1 text-sm text-red-600">{getError('organizer_id')}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('admin.events.form.description', { default: 'Description' })}
          </label>
          <textarea
            value={formState.description}
            onChange={event => updateFormState({ description: event.target.value })}
            rows={4}
            className={`mt-1 block w-full rounded-lg border ${
              getError('description') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
            } shadow-sm focus:border-indigo-500`}
            placeholder={t('admin.events.form.description_placeholder', {
              default: 'Describe the event, highlights and important information',
            })}
          />
          {getError('description') && <p className="mt-1 text-sm text-red-600">{getError('description')}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.date', { default: 'Date' })}
            </label>
            <input
              type="date"
              value={formState.date}
              onChange={event => updateFormState({ date: event.target.value })}
              className={`mt-1 block w-full rounded-lg border ${
                getError('date') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              } shadow-sm focus:border-indigo-500`}
            />
            {getError('date') && <p className="mt-1 text-sm text-red-600">{getError('date')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.time', { default: 'Time' })}
            </label>
            <input
              type="time"
              value={formState.time}
              onChange={event => updateFormState({ time: event.target.value })}
              className={`mt-1 block w-full rounded-lg border ${
                getError('time') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              } shadow-sm focus:border-indigo-500`}
            />
            {getError('time') && <p className="mt-1 text-sm text-red-600">{getError('time')}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.location', { default: 'Location' })}
            </label>
            <input
              type="text"
              value={formState.location}
              onChange={event => updateFormState({ location: event.target.value })}
              className={`mt-1 block w-full rounded-lg border ${
                getError('location') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              } shadow-sm focus:border-indigo-500`}
              placeholder={t('admin.events.form.location_placeholder', { default: 'Enter venue or address' })}
            />
            {getError('location') && <p className="mt-1 text-sm text-red-600">{getError('location')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.image', { default: 'Image URL' })}
            </label>
            <input
              type="url"
              value={formState.image_url}
              onChange={event => updateFormState({ image_url: event.target.value })}
              className={`mt-1 block w-full rounded-lg border ${
                getError('image_url') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              } shadow-sm focus:border-indigo-500`}
              placeholder={t('admin.events.form.image_placeholder', { default: 'https://example.com/event.jpg' })}
            />
            {getError('image_url') && <p className="mt-1 text-sm text-red-600">{getError('image_url')}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.price', { default: 'Base Price' })}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formState.price}
              onChange={event => updateFormState({ price: event.target.value })}
              className={`mt-1 block w-full rounded-lg border ${
                getError('price') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              } shadow-sm focus:border-indigo-500`}
              placeholder="0.00"
            />
            {getError('price') && <p className="mt-1 text-sm text-red-600">{getError('price')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.currency', { default: 'Currency' })}
            </label>
            <select
              value={formState.currency}
              onChange={event => updateFormState({ currency: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {ADMIN_EVENT_CURRENCIES.map(currency => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.capacity', { default: 'Capacity' })}
            </label>
            <input
              type="number"
              min="1"
              value={formState.capacity}
              onChange={event => updateFormState({ capacity: event.target.value })}
              className={`mt-1 block w-full rounded-lg border ${
                getError('capacity') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              } shadow-sm focus:border-indigo-500`}
              placeholder="100"
            />
            {getError('capacity') && <p className="mt-1 text-sm text-red-600">{getError('capacity')}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.events.form.status', { default: 'Status' })}
            </label>
            <select
              value={formState.status}
              onChange={event => updateFormState({ status: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {ADMIN_EVENT_STATUSES.map(statusValue => (
                <option key={statusValue} value={statusValue}>
                  {statusValue === 'DRAFT'
                    ? t('admin.events.status.draft', { default: 'Draft' })
                    : statusValue === 'PUBLISHED'
                    ? t('admin.events.status.published', { default: 'Published' })
                    : statusValue === 'CANCELLED'
                    ? t('admin.events.status.cancelled', { default: 'Cancelled' })
                    : t('admin.events.status.completed', { default: 'Completed' })}
                </option>
              ))}
            </select>
            {getError('status') && <p className="mt-1 text-sm text-red-600">{getError('status')}</p>}
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="featured"
              type="checkbox"
              checked={formState.featured}
              onChange={event => updateFormState({ featured: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">
              {t('admin.events.form.featured', { default: 'Mark as featured' })}
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {t('admin.events.form.categories', { default: 'Categories' })}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {CATEGORIES.map(category => {
              const isChecked = formState.categories.includes(category.id);
              return (
                <label
                  key={category.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${
                    isChecked ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">{category.name}</span>
                </label>
              );
            })}
          </div>
          {getError('categories') && <p className="mt-2 text-sm text-red-600">{getError('categories')}</p>}
          {!getError('categories') && categoryError && <p className="mt-2 text-sm text-red-600">{categoryError}</p>}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('admin.events.form.ticket_types', { default: 'Ticket types' })}
          </h2>
          <button
            type="button"
            onClick={addTicketType}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4" />
            {t('admin.events.form.ticket_add', { default: 'Add ticket type' })}
          </button>
        </div>

        <div className="space-y-4">
          {ticketTypes.map((ticket, index) => {
            const nameKey = `ticket_types.${index}.name`;
            const priceKey = `ticket_types.${index}.price`;
            const quantityKey = `ticket_types.${index}.quantity`;
            const availableKey = `ticket_types.${index}.available`;
            const maxPerOrderKey = `ticket_types.${index}.max_per_order`;

            return (
              <div key={ticket.id ?? index} className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('admin.events.form.ticket_label', { default: 'Ticket type {index}', index: index + 1 })}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeTicketType(index)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    disabled={ticketTypes.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('common.remove', { default: 'Remove' })}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('admin.events.form.ticket_name', { default: 'Name' })}
                    </label>
                    <input
                      type="text"
                      value={ticket.name}
                      onChange={event => updateTicketType(index, { name: event.target.value })}
                      className={`mt-1 block w-full rounded-lg border ${
                        getError(nameKey) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                      } shadow-sm focus:border-indigo-500`}
                      placeholder={t('admin.events.form.ticket_name_placeholder', { default: 'General Admission' })}
                    />
                    {getError(nameKey) && <p className="mt-1 text-sm text-red-600">{getError(nameKey)}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('admin.events.form.ticket_price', { default: 'Price' })}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticket.price}
                      onChange={event => updateTicketType(index, { price: event.target.value })}
                      className={`mt-1 block w-full rounded-lg border ${
                        getError(priceKey) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                      } shadow-sm focus:border-indigo-500`}
                      placeholder="0.00"
                    />
                    {getError(priceKey) && <p className="mt-1 text-sm text-red-600">{getError(priceKey)}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('admin.events.form.ticket_description', { default: 'Description' })}
                  </label>
                  <textarea
                    value={ticket.description}
                    onChange={event => updateTicketType(index, { description: event.target.value })}
                    rows={3}
                    className={`mt-1 block w-full rounded-lg border ${
                      getError(`ticket_types.${index}.description`)
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-indigo-500'
                    } shadow-sm focus:border-indigo-500`}
                    placeholder={t('admin.events.form.ticket_description_placeholder', {
                      default: 'Describe seating, benefits or access level',
                    })}
                  />
                  {getError(`ticket_types.${index}.description`) && (
                    <p className="mt-1 text-sm text-red-600">{getError(`ticket_types.${index}.description`)}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('admin.events.form.ticket_quantity', { default: 'Quantity' })}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ticket.quantity}
                      onChange={event => updateTicketType(index, { quantity: event.target.value })}
                      className={`mt-1 block w-full rounded-lg border ${
                        getError(quantityKey) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                      } shadow-sm focus:border-indigo-500`}
                      placeholder="0"
                    />
                    {getError(quantityKey) && <p className="mt-1 text-sm text-red-600">{getError(quantityKey)}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('admin.events.form.ticket_available', { default: 'Available' })}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ticket.available}
                      onChange={event => updateTicketType(index, { available: event.target.value })}
                      className={`mt-1 block w-full rounded-lg border ${
                        getError(availableKey) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                      } shadow-sm focus:border-indigo-500`}
                      placeholder={t('admin.events.form.ticket_available_placeholder', { default: 'Defaults to quantity' })}
                    />
                    {getError(availableKey) && <p className="mt-1 text-sm text-red-600">{getError(availableKey)}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('admin.events.form.ticket_max_per_order', { default: 'Max per order' })}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ticket.max_per_order}
                      onChange={event => updateTicketType(index, { max_per_order: event.target.value })}
                      className={`mt-1 block w-full rounded-lg border ${
                        getError(maxPerOrderKey)
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-indigo-500'
                      } shadow-sm focus:border-indigo-500`}
                      placeholder="1"
                    />
                    {getError(maxPerOrderKey) && <p className="mt-1 text-sm text-red-600">{getError(maxPerOrderKey)}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          disabled={isSubmitting}
        >
          {t('common.cancel', { default: 'Cancel' })}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t('admin.events.form.saving', { default: 'Saving...' })
            : event
            ? t('admin.events.form.update', { default: 'Update event' })
            : t('admin.events.form.create', { default: 'Create event' })}
        </button>
      </div>
    </form>
  );
}
