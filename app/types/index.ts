// Audit columns returned by every GetAll*/GetById* DTO (dates are formatted "MM-dd-yyyy" by the API).
export interface AuditFields {
    createdBy: string;
    dateCreated: string;
    updatedBy: string;
    dateUpdated: string;
    isActive: boolean;
}
