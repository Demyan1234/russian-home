import { useState, useEffect } from 'react'
import { Container, Card, Button, Alert, Table, Badge } from 'react-bootstrap'
import { checkPaymentConfig, testYookassa } from '../http/paymentAPI'

const PaymentTest = () => {
    const [config, setConfig] = useState(null)
    const [loading, setLoading] = useState(false)
    const [testResult, setTestResult] = useState(null)

    const loadConfig = async () => {
        try {
            const result = await checkPaymentConfig()
            setConfig(result)
        } catch (error) {
            console.error('Config load error:', error)
        }
    }

    const runTest = async () => {
        setLoading(true)
        try {
            const result = await testYookassa()
            setTestResult(result)
        } catch (error) {
            setTestResult({ success: false, error: error.message })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadConfig()
    }, [])

    return (
        <Container className="mt-4">
            <h1>Тестирование платежей</h1>
            
            <Card className="mb-4">
                <Card.Header>
                    <h5>Текущая конфигурация</h5>
                </Card.Header>
                <Card.Body>
                    {config ? (
                        <Table striped>
                            <tbody>
                                <tr>
                                    <td><strong>Shop ID</strong></td>
                                    <td>
                                        <Badge bg={config.yookassa?.shopId ? "success" : "danger"}>
                                            {config.yookassa?.shopId || "Не настроен"}
                                        </Badge>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Secret Key</strong></td>
                                    <td>
                                        <Badge bg={config.yookassa?.secretKey ? "success" : "warning"}>
                                            {config.yookassa?.secretKey ? "Настроен" : "Тестовый режим"}
                                        </Badge>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Режим</strong></td>
                                    <td>
                                        <Badge bg={config.yookassa?.initialized ? "success" : "warning"}>
                                            {config.yookassa?.initialized ? "ЮКасса" : "Демо-режим"}
                                        </Badge>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    ) : (
                        <div>Загрузка...</div>
                    )}
                </Card.Body>
            </Card>

            <Card>
                <Card.Header>
                    <h5>Тест платежной системы</h5>
                </Card.Header>
                <Card.Body>
                    <Button 
                        variant="primary" 
                        onClick={runTest}
                        disabled={loading}
                    >
                        {loading ? 'Тестирование...' : 'Запустить тест'}
                    </Button>

                    {testResult && (
                        <Alert 
                            variant={testResult.success ? "success" : "danger"} 
                            className="mt-3"
                        >
                            <h6>Результат теста:</h6>
                            <pre>{JSON.stringify(testResult, null, 2)}</pre>
                        </Alert>
                    )}

                    <div className="mt-4 p-3 bg-light rounded">
                        <h6>Инструкция по тестированию:</h6>
                        <ol>
                            <li>Создайте заказ в корзине</li>
                            <li>Перейдите к оформлению заказа</li>
                            <li>Нажмите "Тест оплаты"</li>
                            <li>Используйте тестовую карту: <code>5555 5555 5555 4477</code></li>
                            <li>Введите любые дату и CVC</li>
                        </ol>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    )
}

export default PaymentTest