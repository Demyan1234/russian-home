// import React, { useState, useEffect } from 'react'
// import { Container, Card, Alert, Button, Spinner } from 'react-bootstrap'
// import { useSearchParams, useNavigate } from 'react-router-dom'

// const EmailConfirmation = () => {
//     const [searchParams] = useSearchParams()
//     const navigate = useNavigate()
//     const [status, setStatus] = useState('loading')
//     const [message, setMessage] = useState('')

//     useEffect(() => {
//         const token = searchParams.get('token')
        
//         if (!token) {
//             setStatus('error')
//             setMessage('Токен подтверждения не найден в ссылке')
//             return
//         }

//         verifyEmail(token)
//     }, [searchParams])

//     const verifyEmail = async (token) => {
//         try {
//             setStatus('loading')
//             const response = await fetch('/api/auth/verify-email', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ token })
//             })
            
//             if (!response.ok) {
//                 const errorData = await response.json()
//                 throw new Error(errorData.error || 'Ошибка подтверждения')
//             }
            
//             const data = await response.json()
//             setStatus('success')
//             setMessage(data.message || 'Ваш email успешно подтвержден!')
//         } catch (error) {
//             setStatus('error')
//             setMessage(error.message || 'Ошибка подтверждения email. Ссылка может быть устаревшей.')
//         }
//     }

//     const handleResendEmail = async () => {
//         try {
//             const token = localStorage.getItem('token')
//             const response = await fetch('/api/auth/resend-verification-email', {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': `Bearer ${token}`,
//                     'Content-Type': 'application/json'
//                 }
//             })
            
//             if (!response.ok) throw new Error('Ошибка отправки письма')
            
//             setMessage('Письмо с подтверждением отправлено повторно. Проверьте вашу почту.')
//         } catch (error) {
//             setMessage('Ошибка при отправке письма. Попробуйте позже.')
//         }
//     }

//     const getStatusConfig = () => {
//         const configs = {
//             loading: {
//                 icon: '⏳',
//                 title: 'Подтверждение email...',
//                 variant: 'info',
//                 button: null
//             },
//             success: {
//                 icon: '✅',
//                 title: 'Email подтвержден!',
//                 variant: 'success',
//                 button: { text: 'Перейти в магазин', action: () => navigate('/shop') }
//             },
//             error: {
//                 icon: '❌',
//                 title: 'Ошибка подтверждения',
//                 variant: 'danger',
//                 button: { text: 'Отправить письмо повторно', action: handleResendEmail }
//             }
//         }
//         return configs[status] || configs.error
//     }

//     const config = getStatusConfig()

//     return (
//         <Container className="d-flex align-items-center justify-content-center min-vh-100">
//             <Card style={{ maxWidth: '500px', width: '100%' }} className="shadow-lg border-0">
//                 <Card.Body className="text-center p-5">
//                     <div className="mb-4" style={{ fontSize: '4rem' }}>
//                         {config.icon}
//                     </div>

//                     <h3 className="mb-3 fw-bold">{config.title}</h3>

//                     <Alert variant={config.variant} className="mb-4">
//                         {message}
//                     </Alert>

//                     <div className="d-grid gap-2">
//                         {config.button && (
//                             <Button 
//                                 variant={config.variant === 'success' ? 'success' : 'outline-primary'}
//                                 size="lg"
//                                 onClick={config.button.action}
//                             >
//                                 {config.button.text}
//                             </Button>
//                         )}
                        
//                         <Button 
//                             variant="outline-secondary" 
//                             onClick={() => navigate('/')}
//                         >
//                             На главную
//                         </Button>
//                     </div>

//                     {status === 'error' && (
//                         <div className="mt-3 small text-muted">
//                             <p>Если проблема повторяется:</p>
//                             <ul className="text-start">
//                                 <li>Проверьте папку "Спам" в вашей почте</li>
//                                 <li>Убедитесь что ссылка не была повреждена</li>
//                                 <li>Попробуйте зарегистрироваться заново</li>
//                             </ul>
//                         </div>
//                     )}
//                 </Card.Body>
//             </Card>
//         </Container>
//     )
// }

// export default EmailConfirmation