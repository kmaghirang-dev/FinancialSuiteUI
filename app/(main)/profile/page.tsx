'use client';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import PageHeader from '@/app/components/PageHeader';
import identityService, { AccountInfo } from '@/app/services/identity.service';
import { useToast } from '@/layout/context/toastcontext';

const detailsSchema = z.object({
    dateOfBirth: z.date().nullable(),
    nationality: z.string().max(100, 'Nationality must be at most 100 characters')
});
type DetailsForm = z.infer<typeof detailsSchema>;

const passwordSchema = z
    .object({
        oldPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string()
    })
    .refine((values) => values.newPassword === values.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type PasswordForm = z.infer<typeof passwordSchema>;

// DateOnly is exchanged as "yyyy-MM-dd".
const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const PasswordInput = ({ id, field, invalid, autoComplete }: { id: string; field: any; invalid: boolean; autoComplete: string }) => (
    <Password inputId={id} value={field.value} onChange={(e) => field.onChange(e.target.value)} onBlur={field.onBlur} feedback={false} toggleMask autoComplete={autoComplete} className={classNames('w-full', { 'p-invalid': invalid })} inputClassName="w-full" />
);

const ProfilePage = () => {
    const { showSuccess, showError } = useToast();
    const [account, setAccount] = useState<AccountInfo | null>(null);

    const details = useForm<DetailsForm>({ resolver: zodResolver(detailsSchema), defaultValues: { dateOfBirth: null, nationality: '' } });
    const password = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema), defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' } });

    useEffect(() => {
        identityService.getAccountInfo().then(setAccount).catch(showError);
    }, [showError]);

    const saveDetails = details.handleSubmit(async (values) => {
        try {
            await identityService.updateUserDetails({ dateOfBirth: values.dateOfBirth ? toDateOnly(values.dateOfBirth) : null, nationality: values.nationality });
            showSuccess('Details saved. Sign in again for age-based permissions to pick them up.');
        } catch (error) {
            showError(error);
        }
    });

    const changePassword = password.handleSubmit(async ({ oldPassword, newPassword }) => {
        try {
            await identityService.changePassword({ oldPassword, newPassword });
            password.reset();
            showSuccess('Password changed.');
        } catch (error) {
            showError(error);
        }
    });

    return (
        <>
            <PageHeader title="My Profile" description="Your account and personal details." icon="pi pi-id-card" />

            <div className="grid">
                <div className="col-12 lg:col-4">
                    <div className="card">
                        <h5 className="mt-0">Account</h5>
                        <div className="text-sm text-color-secondary mb-1">Email</div>
                        <div className="font-medium mb-3 overflow-hidden text-overflow-ellipsis">{account?.email ?? '…'}</div>
                        {account && <Tag value={account.isEmailConfirmed ? 'Email confirmed' : 'Email not confirmed'} severity={account.isEmailConfirmed ? 'success' : 'warning'} />}
                    </div>
                </div>

                <div className="col-12 lg:col-8">
                    <div className="card">
                        <h5 className="mt-0">Personal details</h5>
                        <p className="text-color-secondary text-sm mt-0">The API does not return these values, so the form starts empty. Saving replaces both fields.</p>
                        <form onSubmit={saveDetails} className="p-fluid formgrid grid">
                            <div className="field col-12 md:col-6">
                                <label htmlFor="dateOfBirth">Date of birth</label>
                                <Controller
                                    name="dateOfBirth"
                                    control={details.control}
                                    render={({ field }) => <Calendar inputId="dateOfBirth" value={field.value} onChange={(e) => field.onChange(e.value ?? null)} dateFormat="yy-mm-dd" showIcon showButtonBar maxDate={new Date()} />}
                                />
                            </div>
                            <div className="field col-12 md:col-6">
                                <label htmlFor="nationality">Nationality</label>
                                <Controller
                                    name="nationality"
                                    control={details.control}
                                    render={({ field }) => <InputText id="nationality" {...field} className={classNames({ 'p-invalid': details.formState.errors.nationality })} />}
                                />
                                {details.formState.errors.nationality && <small className="p-error">{details.formState.errors.nationality.message}</small>}
                            </div>
                            <div className="col-12">
                                <Button type="submit" label="Save details" icon="pi pi-check" loading={details.formState.isSubmitting} className="w-auto" />
                            </div>
                        </form>
                    </div>

                    <div className="card">
                        <h5 className="mt-0">Change password</h5>
                        <form onSubmit={changePassword} className="p-fluid formgrid grid">
                            <div className="field col-12">
                                <label htmlFor="oldPassword">Current password</label>
                                <Controller name="oldPassword" control={password.control} render={({ field }) => <PasswordInput id="oldPassword" field={field} invalid={!!password.formState.errors.oldPassword} autoComplete="current-password" />} />
                                {password.formState.errors.oldPassword && <small className="p-error">{password.formState.errors.oldPassword.message}</small>}
                            </div>
                            <div className="field col-12 md:col-6">
                                <label htmlFor="newPassword">New password</label>
                                <Controller name="newPassword" control={password.control} render={({ field }) => <PasswordInput id="newPassword" field={field} invalid={!!password.formState.errors.newPassword} autoComplete="new-password" />} />
                                {password.formState.errors.newPassword && <small className="p-error">{password.formState.errors.newPassword.message}</small>}
                            </div>
                            <div className="field col-12 md:col-6">
                                <label htmlFor="confirmPassword">Confirm new password</label>
                                <Controller
                                    name="confirmPassword"
                                    control={password.control}
                                    render={({ field }) => <PasswordInput id="confirmPassword" field={field} invalid={!!password.formState.errors.confirmPassword} autoComplete="new-password" />}
                                />
                                {password.formState.errors.confirmPassword && <small className="p-error">{password.formState.errors.confirmPassword.message}</small>}
                            </div>
                            <div className="col-12">
                                <Button type="submit" label="Change password" icon="pi pi-lock" loading={password.formState.isSubmitting} className="w-auto" />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfilePage;
