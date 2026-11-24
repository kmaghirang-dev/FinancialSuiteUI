'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';
import { classNames } from 'primereact/utils';
import { getErrorMessage } from '@/app/services/api-client';
import { getSession } from '@/app/services/auth-session';
import authService from '@/app/services/auth.service';

const schema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required')
});
type LoginForm = z.infer<typeof schema>;

const LoginPage = () => {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<LoginForm>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

    useEffect(() => {
        if (getSession()) router.replace('/');
    }, [router]);

    const onSubmit = async ({ email, password }: LoginForm) => {
        setError(null);
        try {
            await authService.login(email, password);
            router.replace('/');
        } catch (e) {
            // Identity answers 401 with an empty body for bad credentials.
            setError((e as { status?: number }).status === 401 ? 'Invalid email or password.' : getErrorMessage(e));
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="text-center mb-5">
                    <img src="/images/logo.svg" alt="" width={64} height={64} className="mb-3" />
                    <h1 className="text-3xl font-semibold m-0 mb-2">Welcome back</h1>
                    <p className="text-color-secondary m-0">Sign in to FinancialSuite</p>
                </div>

                {error && <Message severity="error" text={error} className="w-full mb-4 justify-content-start" />}

                <form onSubmit={handleSubmit(onSubmit)} className="p-fluid" noValidate>
                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <span className="p-input-icon-left block w-full">
                                    <i className="pi pi-envelope" />
                                    <InputText id="email" type="email" autoComplete="username" placeholder="you@example.com" {...field} className={classNames({ 'p-invalid': errors.email })} />
                                </span>
                            )}
                        />
                        {errors.email && <small className="p-error">{errors.email.message}</small>}
                    </div>

                    <div className="field">
                        <label htmlFor="password">Password</label>
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <Password
                                    inputId="password"
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    onBlur={field.onBlur}
                                    feedback={false}
                                    toggleMask
                                    autoComplete="current-password"
                                    className={classNames('w-full', { 'p-invalid': errors.password })}
                                    inputClassName="w-full"
                                />
                            )}
                        />
                        {errors.password && <small className="p-error">{errors.password.message}</small>}
                    </div>

                    <Button type="submit" label="Sign in" icon="pi pi-sign-in" loading={isSubmitting} className="mt-2 p-3" />
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
