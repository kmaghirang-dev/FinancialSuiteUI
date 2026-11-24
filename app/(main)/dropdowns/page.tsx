'use client';
import Link from 'next/link';
import { z } from 'zod';
import { Button } from 'primereact/button';
import CrudPage, { CrudColumn, CrudForm } from '@/app/components/crud/CrudPage';
import { invalidateDropDownOptions } from '@/app/hooks/useDropDownOptions';
import { DropDownCategory, dropDownCategoryService } from '@/app/services/dropdown.service';

// Mirrors CreateDropDownCategoryCommandValidator / UpdateDropDownCategoryCommandValidator.
const schema = z.object({
    value: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters')
});
type CategoryForm = z.infer<typeof schema>;

const form: CrudForm<DropDownCategory, CategoryForm> = {
    schema,
    fields: [{ name: 'value', label: 'Category name', type: 'text', required: true, maxLength: 100 }],
    defaultValues: { value: '' },
    toFormValues: (category) => ({ value: category.value })
};

const columns: CrudColumn<DropDownCategory>[] = [
    { field: 'value', header: 'Category', sortField: 'Value' },
    { field: 'createdBy', header: 'Created By' },
    { field: 'dateCreated', header: 'Created On' }
];

const DropDownCategoriesPage = () => (
    <CrudPage
        title="Dropdown Lists"
        description="Lookup values used across the app (media categories, statuses, seasons…). Listing requires the SuperAdmin role and a date of birth of age 20+ (set it in My Profile, then sign in again)."
        icon="pi pi-list"
        entityName="Category"
        service={dropDownCategoryService}
        idField="dropDownCategoryId"
        nameField="value"
        columns={columns}
        form={form}
        searchable
        onChanged={invalidateDropDownOptions}
        rowActions={(row) => (
            <Link href={`/dropdowns/${row.dropDownCategoryId}`}>
                <Button icon="pi pi-sitemap" rounded text aria-label="Manage values" tooltip="Manage values" tooltipOptions={{ position: 'top' }} />
            </Link>
        )}
    />
);

export default DropDownCategoriesPage;
