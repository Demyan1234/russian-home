import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { adminAPI } from '../../http/adminAPI';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await adminAPI.getUsers();
            setUsers(response.data || []);
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Не удалось загрузить пользователей');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = (user) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setShowRoleModal(true);
    };

    const updateUserRole = async () => {
        try {
            setError('');
            await adminAPI.updateUserRole(selectedUser.id, newRole);
            await loadUsers();
            setShowRoleModal(false);
            alert('Роль пользователя успешно изменена');
        } catch (error) {
            console.error('Error updating role:', error);
            setError('Ошибка при изменении роли: ' + error.message);
        }
    };

    const deleteUser = async (userId, userName) => {
        if (!window.confirm(`Вы уверены, что хотите удалить пользователя ${userName}?`)) return;

        try {
            setError('');
            await adminAPI.deleteUser(userId);
            await loadUsers();
            alert('Пользователь успешно удален');
        } catch (error) {
            console.error('Error deleting user:', error);
            setError('Ошибка при удалении пользователя: ' + error.message);
        }
    };

    const getRoleBadge = (role) => {
        const variants = {
            admin: { bg: 'danger', text: 'Администратор' },
            manager: { bg: 'warning', text: 'Менеджер' },
            user: { bg: 'secondary', text: 'Пользователь' }
        };
        
        const variant = variants[role] || variants.user;
        return <Badge bg={variant.bg}>{variant.text}</Badge>;
    };

    if (loading) {
        return (
            <div className="text-center p-4">
                <Spinner animation="border" variant="primary" />
                <div className="mt-2">Загрузка пользователей...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>Управление пользователями</h4>
                <Badge bg="light" text="dark">
                    Всего: {users.length}
                </Badge>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Имя</th>
                        <th>Роль</th>
                        <th>Дата регистрации</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>
                                {user.email}
                                {user.email_verified && (
                                    <Badge bg="success" className="ms-2" title="Email подтвержден">
                                        ✓
                                    </Badge>
                                )}
                            </td>
                            <td>{user.name || 'Не указано'}</td>
                            <td>{getRoleBadge(user.role)}</td>
                            <td>{user.created_at}</td>
                            <td>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="me-2"
                                    onClick={() => handleRoleChange(user)}
                                >
                                    Изменить роль
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => deleteUser(user.id, user.name || user.email)}
                                >
                                    Удалить
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Модальное окно изменения роли */}
            <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Изменение роли пользователя</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <>
                            <p>
                                Пользователь: <strong>{selectedUser.name || selectedUser.email}</strong>
                            </p>
                            <Form.Group>
                                <Form.Label>Новая роль:</Form.Label>
                                <Form.Select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                >
                                    <option value="user">Пользователь</option>
                                    <option value="manager">Менеджер</option>
                                    <option value="admin">Администратор</option>
                                </Form.Select>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
                        Отмена
                    </Button>
                    <Button variant="primary" onClick={updateUserRole}>
                        Сохранить
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default UserManagement;