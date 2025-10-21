import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { createCategory } from '../../http/catalogAPI'

const CreateCategory = ({ show, setShow, setChange }) => {
    const [name, setName] = useState('')
    const [image, setImage] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('name', name)
            if (image) {
                formData.append('image', image)
            }

            console.log(' Creating category:', { name })

            await createCategory(formData)
            
            setName('')
            setImage(null)
            setShow(false)
            setChange(prev => !prev)
            
            alert('Категория успешно создана!')
            
        } catch (error) {
            setError(error.message || 'Ошибка при создании категории')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setShow(false)
        setError('')
        setName('')
        setImage(null)
    }

    const handleImageChange = (e) => {
        setImage(e.target.files[0])
    }

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Создать категорию</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Название категории *</Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Введите название категории"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Изображение</Form.Label>
                        <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        <Form.Text className="text-muted">
                            Необязательное поле
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Отмена
                    </Button>
                    <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading}
                    >
                        {loading ? 'Создание...' : 'Создать категорию'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default CreateCategory