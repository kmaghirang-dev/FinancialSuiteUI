import { AuditFields } from '../types';
import apiClient from './api-client';
import { getCurrentUserEmail } from './auth-session';
import createService, { PagedQuery } from './http-service';

export interface DropDownCategory extends AuditFields {
    dropDownCategoryId: string;
    value: string;
}

export interface DropDownDetail extends AuditFields {
    dropDownDetailId: string;
    dropDownCategoryId: string;
    code: string;
    displayValue: string;
}

export interface DropDownCategoryRequest {
    value: string;
}

export interface DropDownDetailRequest {
    code: string;
    displayValue: string;
}

// Category values from the API's DropDownCategoryValues.
export const DROPDOWN_CATEGORIES = {
    mediaType: 'MediaType',
    mediaStatus: 'MediaStatus'
};

// Active details of an active category, looked up by its Value; unlike the category endpoints this needs no SuperAdmin role.
export const getDropDownDetailsByCategory = (category: string) => apiClient<DropDownDetail[]>(`dropdown/details/${encodeURIComponent(category)}`);

const categoryEndpoint = 'dropdown/category';
const categories = createService(categoryEndpoint);

// Unlike the other features, dropdown commands take CreatedBy/UpdatedBy from the request body.
export const dropDownCategoryService = {
    getAll: () => categories.getAll<DropDownCategory>(),
    getPaginated: (query: PagedQuery) => categories.getPaginated<DropDownCategory>(query),
    getById: (id: string) => categories.getById<DropDownCategory>(id),
    create: (data: DropDownCategoryRequest) => categories.create({ ...data, createdBy: getCurrentUserEmail() }),
    update: (id: string, data: DropDownCategoryRequest) => categories.update(id, { ...data, updatedBy: getCurrentUserEmail() }),
    toggle: (id: string, isActive: boolean) => categories.toggle(id, { isActive, updatedBy: getCurrentUserEmail() }),
    delete: (id: string) => categories.toggle(id, { isActive: false, updatedBy: getCurrentUserEmail() })
};

export const dropDownDetailService = (categoryId: string) => {
    const endpoint = `${categoryEndpoint}/${categoryId}/details`;
    const details = createService(endpoint);

    return {
        getAll: () => details.getAll<DropDownDetail>(),
        getPaginated: (query: PagedQuery) => details.getPaginated<DropDownDetail>(query),
        getById: (id: string) => details.getById<DropDownDetail>(id),
        create: (data: DropDownDetailRequest) => details.create({ ...data, createdBy: getCurrentUserEmail() }),
        update: (id: string, data: DropDownDetailRequest) => details.update(id, { ...data, updatedBy: getCurrentUserEmail() }),
        toggle: (id: string, isActive: boolean) => details.toggle(id, { isActive, updatedBy: getCurrentUserEmail() }),
        delete: (id: string) => details.toggle(id, { isActive: false, updatedBy: getCurrentUserEmail() })
    };
};
