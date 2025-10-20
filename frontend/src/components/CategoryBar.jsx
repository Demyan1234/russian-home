import { observer } from 'mobx-react-lite'
import { useContext } from 'react'
import { Button, ButtonGroup } from 'react-bootstrap'
import { AppContext } from '../context/ContextProvider'

const CategoryBar = observer(() => {
    const { catalog } = useContext(AppContext)

    const handleCategoryClick = async (categoryId) => {
        try {
            catalog.category = categoryId
            
            const params = categoryId && categoryId !== 'all' ? { category: categoryId } : {}
            const response = await fetch(`/api/catalog?${new URLSearchParams(params)}`)
            const data = await response.json()
            
            if (data.success) {
                catalog.products = data.data.products || []
                catalog.count = data.data.pagination?.totalCount || 0
                catalog.page = 1
            }
        } catch (error) {
            console.error('Category filter error:', error)
        }
    }

    return (
        <div className="mb-4">
        </div>
    )
})

export default CategoryBar