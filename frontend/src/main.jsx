import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RootWrapper from './RootWrapper.jsx'
import {Provider} from 'react-redux'
import store from './store/store.js'
import { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')).render(
  <StrictMode>
     <Provider store={store}>
        <Toaster position="top-right" reverseOrder={false} />
      <RootWrapper />
    </Provider>
  </StrictMode>,
)
