import LoadingOverlay from 'react-loading-overlay-nextgen'
import {GridLoader} from 'react-spinners'
import { useAuth } from './other/AuthContext';
export default function MyLoader({ children }) {
    const { loading} = useAuth();
  return (
    <LoadingOverlay
      active={loading}
      spinner={<GridLoader color='#36d7b7' />} 
    >
      {children}
    </LoadingOverlay>
  )
}