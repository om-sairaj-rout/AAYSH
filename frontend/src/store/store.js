import {configureStore} from '@reduxjs/toolkit';
import authReducer from './slice/checkAuth';

const store = configureStore({
    reducer:{
        auth: authReducer
    }
});

export default store;