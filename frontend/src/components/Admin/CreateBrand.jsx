import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { useState } from 'react'
import { createBrand } from '../../http/catalogAPI'

const CreateBrand = ({ show, setShow, setChange }) => {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const brandData = {
                name: name.trim()
            }

            await createBrand(brandData)
            
            setName('')
            setShow(false)
            setChange(prev => !prev)
            
            alert('Бренд успешно создан!')
            
        } catch (error) {
            setError(error.message || 'Ошибка при создании бренда')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setShow(false)
        setError('')
        setName('')
    }

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Добавить бренд</Modal.Title>
            </Modal.Header>
            
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Название бренда *</Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Например: Grohe, Hansgrohe, Roca"
                            required
                        />
                        <Form.Text className="text-muted">
                            Укажите название бренда
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>
                        Отмена
                    </Button>
                    <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading || !name.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                Создание...
                            </>
                        ) : (
                            'Создать бренд'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default CreateBrand