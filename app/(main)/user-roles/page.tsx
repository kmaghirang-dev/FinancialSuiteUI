'use client';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import PageHeader from '@/app/components/PageHeader';
import identityService, { USER_ROLES, UserRoleRequest } from '@/app/services/identity.service';
import { useToast } from '@/layout/context/toastcontext';

const schema = z.object({
    userEmail: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    role: z.string({ invalid_type_error: 'Role is required' }).min(1, 'Role is required')
});

const UserRolesPage = () => {
    const { showSuccess, showError } = useToast();
    const [busy, setBusy] = useState<'assign' | 'unassign' | null>(null);
    const {
        control,
        handleSubmit,
        formState: { errors }
    } = useForm<UserRoleRequest>({ resolver: zodResolver(schema), defaultValues: { userEmail: '', role: '' } });

    const submit = (action: 'assign' | 'unassign') =>
        handleSubmit(async (values) => {
            setBusy(action);
            try {
                await (action === 'assign' ? identityService.assignRole(values) : identityService.unassignRole(values));
                showSuccess(`${values.role} role ${action === 'assign' ? 'assigned to' : 'removed from'} ${values.userEmail}.`);
            } catch (error) {
                showError(error);
            } finally {
                setBusy(null);
            }
        });

    return (
        <>
            <PageHeader title="User Roles" description="Assign or remove roles for a user. Requires the Admin role." icon="pi pi-users" />

            <div className="grid">
                <div className="col-12 lg:col-7">
                    <div className="card">
                        <form className="p-fluid formgrid grid" onSubmit={(e) => e.preventDefault()}>
                            <div className="field col-12 md:col-7">
                                <label htmlFor="userEmail">User email</label>
                                <Controller
                                    name="userEmail"
                                    control={control}
                                    render={({ field }) => <InputText id="userEmail" type="email" placeholder="user@example.com" {...field} className={classNames({ 'p-invalid': errors.userEmail })} />}
                                />
                                {errors.userEmail && <small className="p-error">{errors.userEmail.message}</small>}
                            </div>
                            <div className="field col-12 md:col-5">
                                <label htmlFor="role">Role</label>
                                <Controller
                                    name="role"
                                    control={control}
                                    render={({ field }) => (
                                        <Dropdown inputId="role" value={field.value} options={USER_ROLES} onChange={(e) => field.onChange(e.value)} placeholder="Select a role" className={classNames({ 'p-invalid': errors.role })} />
                                    )}
                                />
                                {errors.role && <small className="p-error">{errors.role.message}</small>}
                            </div>
                            <div className="col-12 flex flex-column sm:flex-row gap-2 mt-2">
                                <Button type="button" label="Assign role" icon="pi pi-user-plus" loading={busy === 'assign'} disabled={!!busy} onClick={submit('assign')} />
                                <Button type="button" label="Remove role" icon="pi pi-user-minus" severity="danger" outlined loading={busy === 'unassign'} disabled={!!busy} onClick={submit('unassign')} />
                            </div>
                        </form>
                    </div>
                </div>
                <div className="col-12 lg:col-5">
                    <div className="card">
                        <h5 className="mt-0">About roles</h5>
                        <ul className="pl-3 m-0 line-height-3 text-color-secondary">
                            <li>
                                <b>User</b> – default access to personal features.
                            </li>
                            <li>
                                <b>Admin</b> – can assign and remove roles.
                            </li>
                            <li>
                                <b>SuperAdmin</b> – can manage dropdown lists.
                            </li>
                        </ul>
                        <p className="text-color-secondary text-sm mb-0 mt-3">The API does not expose a user list, so enter the user&apos;s email. Role changes apply the next time that user signs in.</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserRolesPage;
