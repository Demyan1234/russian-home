import { Dropdown } from 'react-bootstrap'
import { observer } from 'mobx-react-lite'

const SortDropdown = observer(({ onSortChange, currentSort }) => {
    const sortOptions = [
        { value: 'price_asc', label: 'По возрастанию цены', sortBy: 'price', sortOrder: 'ASC' },
        { value: 'price_desc', label: 'По убыванию цены', sortBy: 'price', sortOrder: 'DESC' },
        { value: 'name_asc', label: 'По алфавиту (А-Я)', sortBy: 'name', sortOrder: 'ASC' },
        { value: 'name_desc', label: 'По алфавиту (Я-А)', sortBy: 'name', sortOrder: 'DESC' },
        { value: 'rating_desc', label: 'По рейтингу (высокий)', sortBy: 'rating', sortOrder: 'DESC' },
        { value: 'rating_asc', label: 'По рейтингу (низкий)', sortBy: 'rating', sortOrder: 'ASC' }
    ]

    const currentOption = sortOptions.find(opt => 
        opt.sortBy === currentSort?.sortBy && opt.sortOrder === currentSort?.sortOrder
    ) || sortOptions[0]

    return (
        <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" id="sort-dropdown">
                {currentOption.label}
            </Dropdown.Toggle>
            <Dropdown.Menu>
                {sortOptions.map(option => (
                    <Dropdown.Item 
                        key={option.value}
                        onClick={() => onSortChange(option)}
                        active={currentOption.value === option.value}
                    >
                        {option.label}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    )
})

export default SortDropdown