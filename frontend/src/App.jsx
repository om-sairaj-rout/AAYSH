import { useSelector } from 'react-redux';
import Layout from './components/Layout';
import Login from './pages/Login';

function App() {

  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <>
      {isAuthenticated ? <Layout /> : <Login />}
    </>
  )
}

export default App
