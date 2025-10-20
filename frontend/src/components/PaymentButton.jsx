import { useState } from 'react'
import { Button, Spinner, Alert, Card } from 'react-bootstrap'
import { createYookassaPayment, createTestPayment, checkPaymentConfig } from '../http/paymentAPI'

const PaymentButton = ({ 
    orderId, 
    amount, 
    description, 
    onSuccess, 
    onError,
    variant = 'success',
    size = 'lg'
}) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [demoMode, setDemoMode] = useState(true) 

    const handlePayment = async () => {
        setLoading(true)
        setError('')

        try {
            let paymentResult

            if (demoMode) {
                console.log(' Using demo payment mode')
                paymentResult = await createTestPayment({
                    orderId,
                    amount
                })
            } else {
                const config = await checkPaymentConfig()
                
                if (config.yookassa?.initialized) {
                    paymentResult = await createYookassaPayment({
                        orderId,
                        amount,
                        description: description || `Оплата заказа #${orderId}`
                    })
                } else {
                    throw new Error('Платежная система не настроена')
                }
            }
            console.log(' Payment created:', paymentResult)
            if (paymentResult.confirmationUrl) {
                window.location.href = paymentResult.confirmationUrl
            } else {
                throw new Error('Не получен URL для оплаты')
            }
            if (onSuccess) {
                onSuccess(paymentResult)
            }

        } catch (err) {
            console.error(' Payment error:', err)
            setError(err.message)
            if (onError) {
                onError(err.message)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            {demoMode && (
                <Card className="mb-3 border-warning">
                    <Card.Body className="p-3">
                        <small>
                            <strong> ДЕМО-РЕЖИМ</strong>
                            <br />
                            Тестовая карта: <code>5555 5555 5555 4477</code>
                            <br />
                            Любая дата •  Любой CVC
                            <br />
                            Деньги не списываются
                        </small>
                    </Card.Body>
                </Card>
            )}
            
            {error && (
                <Alert variant="danger" className="mb-3">
                    {error}
                </Alert>
            )}
            
            <Button
                variant={demoMode ? "warning" : variant}
                size={size}
                onClick={handlePayment}
                disabled={loading}
                className="w-100"
            >
                {loading ? (
                    <>
                        <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                        />
                        Подготовка оплаты...
                    </>
                ) : (
                    ` ${demoMode ? 'Тест оплаты' : 'Оплатить'} ${amount} руб.`
                )}
            </Button>
            
            <div className="mt-2 text-muted small">
                {demoMode ? (
                    <>
                        <strong>Тестовый режим оплаты</strong>
                        <br />
                        Проверка работы платежной системы
                    </>
                ) : (
                    <>
                        <strong>Безопасная оплата через ЮКассу</strong>
                        <br />
                        Банковские карты, ЮMoney, интернет-банки
                    </>
                )}
            </div>
        </div>
    )
}

export default PaymentButton