import React from 'react';
import { QrType, QrData, QrField } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface DataFormProps {
    type: QrType;
    data: QrData;
    onDataChange: (data: QrData) => void;
}

const FormField: React.FC<{ field: QrField; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void }> = ({ field, value, onChange }) => {
    const { t } = useLanguage();
    const commonProps = {
        id: field.name,
        name: field.name,
        value: value || '',
        onChange: onChange,
        required: field.required,
        placeholder: t[field.placeholderKey as keyof typeof t] as string,
        className: "w-full bg-slate-850 text-white placeholder-slate-500 p-3 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
    };

    const label = <label htmlFor={field.name} className="block text-sm font-medium text-slate-400 mb-1">{t[field.labelKey as keyof typeof t]}</label>;

    if (field.type === 'textarea') {
        return <div>{label}<textarea {...commonProps} rows={3} /></div>;
    }
    if (field.type === 'select') {
        return (
            <div>
                {label}
                <select {...commonProps}>
                    {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{t[opt.labelKey as keyof typeof t]}</option>
                    ))}
                </select>
            </div>
        );
    }
    return <div>{label}<input type={field.type} {...commonProps} /></div>;
};

const DataForm: React.FC<DataFormProps> = ({ type, data, onDataChange }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        onDataChange({ ...data, [e.target.name]: e.target.value });
    };

    return (
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {type.fields.map((field) => (
                <FormField key={field.name} field={field} value={data[field.name]} onChange={handleInputChange} />
            ))}
        </form>
    );
};

export default React.memo(DataForm);
