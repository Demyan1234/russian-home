import { createBrowserRouter } from 'react-router-dom'
import { routes } from '../routes'

export const createAppRouter = () => {
  return createBrowserRouter(routes, {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  })
}