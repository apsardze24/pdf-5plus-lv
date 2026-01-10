import { QrType, QrData } from '../types';

const formatVCard = (data: QrData): string => {
    let vCard = 'BEGIN:VCARD\nVERSION:3.0\n';
    vCard += `N:${data.lastName || ''};${data.firstName || ''}\n`;
    vCard += `FN:${data.firstName || ''} ${data.lastName || ''}\n`;
    if (data.phone) vCard += `TEL;TYPE=CELL:${data.phone}\n`;
    if (data.email) vCard += `EMAIL:${data.email}\n`;
    if (data.company) vCard += `ORG:${data.company}\n`;
    vCard += 'END:VCARD';
    return vCard;
};

const formatWifi = (data: QrData): string => {
    const encryption = data.encryption || 'nopass';
    const ssid = data.ssid || '';
    const password = data.password || '';
    return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
};

const formatEvent = (data: QrData): string => {
    const toUTC = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toISOString().replace(/[-:]|\.\d{3}/g, '');
    };

    let event = 'BEGIN:VEVENT\n';
    if (data.summary) event += `SUMMARY:${data.summary}\n`;
    if (data.location) event += `LOCATION:${data.location}\n`;
    if (data.dtstart) event += `DTSTART:${toUTC(data.dtstart)}\n`;
    if (data.dtend) event += `DTEND:${toUTC(data.dtend)}\n`;
    event += 'END:VEVENT';
    return event;
};

const formatSepa = (data: QrData): string => {
    const truncate = (str: string, len: number) => (str || '').substring(0, len);

    const amount = data.amount ? `EUR${parseFloat(data.amount).toFixed(2)}` : '';
    const iban = (data.iban || '').replace(/\s/g, '');

    const lines = [
        'BCD',                                  // Service Tag
        '002',                                  // Version (001/002)
        '1',                                    // Character Set (UTF-8)
        'SCT',                                  // Identification (SEPA Credit Transfer)
        truncate(data.bic, 11) || '',           // BIC
        truncate(data.name, 70),                // Name
        iban,                                   // IBAN
        amount,                                 // Amount
        '',                                     // Purpose Code
        '',                                     // Creditor Reference
        truncate(data.remittance, 140),         // Remittance Information
        truncate(data.hint, 70)                 // Hint
    ];
    
    return lines.join('\n').trim();
};


export const formatQrData = (type: QrType, data: QrData): string => {
    if (!data || Object.keys(data).length === 0) return '';
    try {
        switch (type.id) {
            case 'url':
                return data.url || '';
            case 'text':
                return data.text || '';
            case 'phone':
                return `tel:${data.phone || ''}`;
            case 'sms':
                return `smsto:${data.phone || ''}:${data.message || ''}`;
            case 'email':
                const subject = encodeURIComponent(data.subject || '');
                const body = encodeURIComponent(data.body || '');
                return `mailto:${data.email || ''}?subject=${subject}&body=${body}`;
            case 'vcard':
                return formatVCard(data);
            case 'wifi':
                return formatWifi(data);
            case 'geo':
                return `geo:${data.latitude || 0},${data.longitude || 0}`;
            case 'event':
                return formatEvent(data);
            case 'sepa':
                return formatSepa(data);
            default:
                return '';
        }
    } catch (error) {
        console.error("Error formatting QR data:", error);
        return "Error";
    }
};