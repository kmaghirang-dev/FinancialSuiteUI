'use client';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import CrudPage, { CrudColumn, CrudForm } from '@/app/components/crud/CrudPage';
import { invalidateDropDownOptions } from '@/app/hooks/useDropDownOptions';
import { DropDownDetail, dropDownCategoryService, dropDownDetailService } from '@/app/services/dropdown.service';

// Mirrors CreateDropDownDetailsCommandValidator / UpdateDropDownDetailsCommandValidator.
const schema = z.object({
    code: z.string().trim().min(1, 'Code is required').max(100, 'Code must be at most 100 characters'),
    displayValue: z.string().trim().min(1, 'Display value is required').max(100, 'Display value must be at most 100 characters')
});
type DetailForm = z.infer<typeof schema>;

const form: CrudForm<DropDownDetail, DetailForm> = {
    schema,
    fields: [
        { name: 'code', label: 'Code', type: 'text', required: true, maxLength: 100, half: true },
        { name: 'displayValue', label: 'Display value', type: 'text', required: true, maxLength: 100, half: true }
    ],
    defaultValues: { code: '', displayValue: '' },
    toFormValues: (detail) => ({ code: detail.code, displayValue: detail.displayValue })
};

const columns: CrudColumn<DropDownDetail>[] = [
    { field: 'code', header: 'Code', sortField: 'Code' },
    { field: 'displayValue', header: 'Display Value', sortField: 'DisplayValue' },
    { field: 'createdBy', header: 'Created By' }
];

const DropDownDetailsPage = ({ params }: { params: { categoryId: string } }) => {
    const { categoryId } = params;
    const service = useMemo(() => dropDownDetailService(categoryId), [categoryId]);
    const [categoryName, setCategoryName] = useState('');

    useEffect(() => {
        dropDownCategoryService
            .getById(categoryId)
            .then((category) => setCategoryName(category.value))
            .catch(() => setCategoryName(''));
    }, [categoryId]);

    return (
        <CrudPage
            title={categoryName ? `${categoryName} values` : 'Dropdown values'}
            description="Values offered by this dropdown list."
            icon="pi pi-sitemap"
            entityName="Value"
            service={service}
            idField="dropDownDetailId"
            nameField="displayValue"
            columns={columns}
            form={form}
            searchable
            onChanged={invalidateDropDownOptions}
            backLink={{ href: '/dropdowns', label: 'Back to dropdown lists' }}
        />
    );
};

export default DropDownDetailsPage;
