import LoadingOverlay from 'react-loading-overlay-nextgen'

import { useAuth } from './other/AuthContext';
export default function MyLoader({ children }) {
    const { loading} = useAuth();
  return (
    <LoadingOverlay
      active={loading}
      spinner text='Loading'
    >
      {children}
    </LoadingOverlay>
  )
}