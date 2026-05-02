import { useSelector } from 'react-redux';
import DashBoard from './pages/DashBoard';
import Login from './pages/Login';

function App() {

  const { isAuthenticated } = useSelector((state) => state.checkAuth);

  return (
    <>
      {isAuthenticated ? <DashBoard /> : <Login />}
    </>
  )
}

export default App
