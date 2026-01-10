import { QrType, DesignOptions } from "../types";
import { UrlIcon, TextIcon, PhoneIcon, SmsIcon, EmailIcon, VCardIcon, WifiIcon, GeoIcon, EventIcon, BankIcon } from "../components/icons/qr/QrTypeIcons";

export const QR_TYPES: QrType[] = [
    {
        id: 'url',
        labelKey: 'type_url',
        icon: UrlIcon,
        fields: [{ name: 'url', labelKey: 'url_label', type: 'text', placeholderKey: 'url_placeholder', required: true }],
        initialData: { url: 'https://' },
    },
    {
        id: 'text',
        labelKey: 'type_text',
        icon: TextIcon,
        fields: [{ name: 'text', labelKey: 'text_label', type: 'textarea', placeholderKey: 'text_placeholder', required: true }],
        initialData: { text: '' },
    },
     {
        id: 'sepa',
        labelKey: 'type_sepa',
        icon: BankIcon,
        fields: [
            { name: 'name', labelKey: 'sepa_name_label', type: 'text', placeholderKey: 'sepa_name_placeholder', required: true },
            { name: 'iban', labelKey: 'sepa_iban_label', type: 'text', placeholderKey: 'sepa_iban_placeholder', required: true },
            { name: 'bic', labelKey: 'sepa_bic_label', type: 'text', placeholderKey: 'sepa_bic_placeholder' },
            { name: 'amount', labelKey: 'sepa_amount_label', type: 'number', placeholderKey: 'sepa_amount_placeholder' },
            { name: 'remittance', labelKey: 'sepa_remittance_label', type: 'textarea', placeholderKey: 'sepa_remittance_placeholder' },
            { name: 'hint', labelKey: 'sepa_hint_label', type: 'text', placeholderKey: 'sepa_hint_placeholder' },
        ],
        initialData: { name: '', iban: '', bic: '', amount: '', remittance: '', hint: '' },
    },
    {
        id: 'phone',
        labelKey: 'type_phone',
        icon: PhoneIcon,
        fields: [{ name: 'phone', labelKey: 'phone_label', type: 'tel', placeholderKey: 'phone_placeholder', required: true }],
        initialData: { phone: '' },
    },
    {
        id: 'sms',
        labelKey: 'type_sms',
        icon: SmsIcon,
        fields: [
            { name: 'phone', labelKey: 'phone_label', type: 'tel', placeholderKey: 'phone_placeholder', required: true },
            { name: 'message', labelKey: 'sms_message_label', type: 'textarea', placeholderKey: 'sms_message_placeholder' }
        ],
        initialData: { phone: '', message: '' },
    },
    {
        id: 'email',
        labelKey: 'type_email',
        icon: EmailIcon,
        fields: [
            { name: 'email', labelKey: 'email_address_label', type: 'email', placeholderKey: 'email_address_placeholder', required: true },
            { name: 'subject', labelKey: 'email_subject_label', type: 'text', placeholderKey: 'email_subject_placeholder' },
            { name: 'body', labelKey: 'email_body_label', type: 'textarea', placeholderKey: 'email_body_placeholder' }
        ],
        initialData: { email: '', subject: '', body: '' },
    },
    {
        id: 'vcard',
        labelKey: 'type_vcard',
        icon: VCardIcon,
        fields: [
            { name: 'firstName', labelKey: 'vcard_firstname_label', type: 'text', placeholderKey: 'vcard_firstname_placeholder', required: true },
            { name: 'lastName', labelKey: 'vcard_lastname_label', type: 'text', placeholderKey: 'vcard_lastname_placeholder' },
            { name: 'phone', labelKey: 'phone_label', type: 'tel', placeholderKey: 'phone_placeholder' },
            { name: 'email', labelKey: 'email_address_label', type: 'email', placeholderKey: 'email_address_placeholder' },
            { name: 'company', labelKey: 'vcard_company_label', type: 'text', placeholderKey: 'vcard_company_placeholder' },
        ],
        initialData: { firstName: '', lastName: '', phone: '', email: '', company: '' },
    },
    {
        id: 'wifi',
        labelKey: 'type_wifi',
        icon: WifiIcon,
        fields: [
            { name: 'ssid', labelKey: 'wifi_ssid_label', type: 'text', placeholderKey: 'wifi_ssid_placeholder', required: true },
            { name: 'password', labelKey: 'wifi_password_label', type: 'text', placeholderKey: 'wifi_password_placeholder' },
            { name: 'encryption', labelKey: 'wifi_encryption_label', type: 'select', placeholderKey: '', options: [
                { value: 'WPA', labelKey: 'wifi_wpa_wpa2' },
                { value: 'WEP', labelKey: 'wifi_wep' },
                { value: 'nopass', labelKey: 'wifi_none' },
            ]}
        ],
        initialData: { ssid: '', password: '', encryption: 'WPA' },
    },
    {
        id: 'geo',
        labelKey: 'type_geo',
        icon: GeoIcon,
        fields: [
            { name: 'latitude', labelKey: 'geo_latitude_label', type: 'number', placeholderKey: 'geo_latitude_placeholder', required: true },
            { name: 'longitude', labelKey: 'geo_longitude_label', type: 'number', placeholderKey: 'geo_longitude_placeholder', required: true },
        ],
        initialData: { latitude: '', longitude: '' },
    },
     {
        id: 'event',
        labelKey: 'type_event',
        icon: EventIcon,
        fields: [
            { name: 'summary', labelKey: 'event_title_label', type: 'text', placeholderKey: 'event_title_placeholder', required: true },
            { name: 'location', labelKey: 'event_location_label', type: 'text', placeholderKey: 'event_location_placeholder' },
            { name: 'dtstart', labelKey: 'event_start_label', type: 'datetime-local', placeholderKey: '' },
            { name: 'dtend', labelKey: 'event_end_label', type: 'datetime-local', placeholderKey: '' },
        ],
        initialData: { summary: '', location: '', dtstart: '', dtend: '' },
    },
];

export const DOT_TYPES: DesignOptions['dotsType'][] = ['rounded', 'dots', 'classy', 'classy-rounded', 'square', 'extra-rounded'];
export const CORNER_TYPES: DesignOptions['cornersType'][] = ['square', 'dot', 'extra-rounded'];