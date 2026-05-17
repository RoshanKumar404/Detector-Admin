import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import issuesReducer from './issuesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    issues: issuesReducer,
  },
});
