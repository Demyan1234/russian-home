import React, { useState, useEffect } from 'react'
import { Container, Card, Alert, Button, Spinner } from 'react-bootstrap'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authAPI } from '../http/authAPI'

const EmailVerification = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [status, setStatus] = useState('loading')
    const [message, setMessage] = useState('')

    useEffect(() => {
        const token = searchParams.get('token')
        
        if (!token) {
            setStatus('error')
            setMessage('Токен подтверждения не найден в ссылке')
            return
        }

        verifyEmail(token)
    }, [searchParams])

    const verifyEmail = async (token) => {
        try {
            setStatus('loading')
            const response = await authAPI.verifyEmail(token)
            
            setStatus('success')
            setMessage(response.message || 'Ваш email успешно подтвержден!')
        } catch (error) {
            setStatus('error')
            setMessage(error.message || 'Ошибка подтверждения email. Ссылка может быть устаревшей.')
        }
    }

    const handleResendEmail = async () => {
        try {
            await authAPI.resendVerification()
            setMessage('Письмо с подтверждением отправлено повторно. Проверьте вашу почту.')
        } catch (error) {
            setMessage('Ошибка при отправке письма. Попробуйте позже.')
        }
    }

    const getStatusConfig = () => {
        const configs = {
            loading: {
                icon: '⏳',
                title: 'Подтверждение email...',
                variant: 'info',
                button: null
            },
            success: {
                icon: '✅',
                title: 'Email подтвержден!',
                variant: 'success',
                button: { text: 'Перейти в магазин', action: () => navigate('/shop') }
            },
            error: {
                icon: '❌',
                title: 'Ошибка подтверждения',
                variant: 'danger',
                button: { text: 'Отправить письмо повторно', action: handleResendEmail }
            }
        }
        return configs[status] || configs.error
    }

    const config = getStatusConfig()

    return (
        <Container className="d-flex align-items-center justify-content-center min-vh-100">
            <Card style={{ maxWidth: '500px', width: '100%' }} className="shadow-lg border-0">
                <Card.Body className="text-center p-5">
                    <div className="mb-4" style={{ fontSize: '4rem' }}>
                        {config.icon}
                    </div>

                    <h3 className="mb-3 fw-bold">{config.title}</h3>

                    <Alert variant={config.variant} className="mb-4">
                        {message}
                    </Alert>

                    <div className="d-grid gap-2">
                        {config.button && (
                            <Button 
                                variant={config.variant === 'success' ? 'success' : 'outline-primary'}
                                size="lg"
                                onClick={config.button.action}
                            >
                                {config.button.text}
                            </Button>
                        )}
                        
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => navigate('/')}
                        >
                            На главную
                        </Button>
                    </div>

                    {status === 'error' && (
                        <div className="mt-3 small text-muted">
                            <p>Если проблема повторяется:</p>
                            <ul className="text-start">
                                <li>Проверьте папку "Спам" в вашей почте</li>
                                <li>Убедитесь что ссылка не была повреждена</li>
                                <li>Попробуйте зарегистрироваться заново</li>
                            </ul>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    )
}

export default EmailVerification