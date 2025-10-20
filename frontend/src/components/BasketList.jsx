import { observer } from 'mobx-react-lite'
import { useContext, useState } from 'react'
import { AppContext } from '../context/ContextProvider'
import { useNavigate } from 'react-router-dom'
import { removeFromBasket, updateBasketItem } from '../http/basketAPI' 

const BasketList = observer(() => {
    const { basket } = useContext(AppContext)
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const handleRemove = async (productId) => {
        setLoading(true)
        try {
            await removeFromBasket(productId) 
            basket.loadBasket() 
        } catch (error) {
            alert('Ошибка удаления: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleQuantityChange = async (productId, newQuantity) => {
        if (newQuantity < 1) return
        setLoading(true)
        
        try {
            await updateBasketItem(productId, newQuantity) 
            basket.loadBasket()
        } catch (error) {
            alert('Ошибка обновления: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCheckout = () => {
        navigate('/checkout')
    }

    if (basket.products.length === 0) {
        return (
            <div className="text-center p-5">
                <h3>Корзина пуста</h3>
                <p>Добавьте товары из каталога</p>
                <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/shop')} 
                >
                    Перейти к покупкам
                </button>
            </div>
        )
    }

    return (
        <div>
            <h2>Корзина</h2>
            {loading && <div className="alert alert-info">Обновление...</div>}
            
            <div className="basket-items">
                {basket.products.map(item => (
                    <div key={item.product_id || item.id} className="basket-item" style={{
                        border: '1px solid #ddd',
                        padding: '15px',
                        marginBottom: '10px',
                        borderRadius: '5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{flex: 1}}>
                            <h5>{item.name}</h5>
                            <p>Цена: {item.finalPrice || item.price} руб.</p>
                        </div>
                        
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <button 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleQuantityChange(item.product_id || item.id, item.quantity - 1)}
                                disabled={loading || item.quantity <= 1}
                            >
                                -
                            </button>
                            <span style={{minWidth: '30px', textAlign: 'center'}}>{item.quantity}</span>
                            <button 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleQuantityChange(item.product_id || item.id, item.quantity + 1)}
                                disabled={loading}
                            >
                                +
                            </button>
                        </div>
                        
                        <div>
                            <span style={{fontWeight: 'bold', marginRight: '15px'}}>
                                {((item.finalPrice || item.price) * item.quantity).toFixed(2)} руб.
                            </span>
                            <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemove(item.product_id || item.id)}
                                disabled={loading}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={{marginTop: '20px', textAlign: 'right'}}>
                <h4>Итого: {basket.totalAmount.toFixed(2)} руб.</h4>
                <p>Товаров: {basket.totalItems || basket.products.length} шт.</p>
                <button 
                    className="btn btn-success btn-lg"
                    onClick={handleCheckout}
                    disabled={loading}
                >
                    Оформить заказ
                </button>
            </div>
        </div>
    )
})

export default BasketList