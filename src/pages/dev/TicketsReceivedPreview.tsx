import TicketsDesk from '../../components/design/TicketsDesk';

/** Local-only example of Billets reçus. Not included in the production bundle. */
export default function TicketsReceivedPreview() {
  if (!import.meta.env.DEV) return null;
  return (
    <TicketsDesk
      tickets={[
        {
          id: 'ex-1',
          eventTitle: 'MALAKEY EN CONCERT',
          eventDate: '2026-12-18',
          eventTime: '19:00',
          venue: 'Maison de la culture',
          city: 'Bobo-Dioulasso',
          holder: 'Votre nom',
          categoryName: 'Standard',
          price: 3000,
          qrValue: 'exemple',
          ticketCode: 'EX-0001',
          orderCode: 'EXEMPLE',
          state: 'valid',
        },
        {
          id: 'ex-2',
          eventTitle: 'MALAKEY EN CONCERT',
          eventDate: '2026-12-18',
          eventTime: '19:00',
          venue: 'Maison de la culture',
          city: 'Bobo-Dioulasso',
          holder: 'Votre nom',
          categoryName: 'VIP',
          price: 5000,
          qrValue: 'exemple',
          ticketCode: 'EX-0002',
          orderCode: 'EXEMPLE',
          state: 'valid',
        },
      ]}
      paymentLabel="MOBILE_MONEY"
      paidAtLabel="14 nov. 2026 à 16:30"
      phoneHint="+22670123456"
      total={11000}
      onDownload={() => undefined}
      onCalendar={() => undefined}
      onTransfer={() => undefined}
      onShare={() => undefined}
    />
  );
}
