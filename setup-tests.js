import mockIndexedDB from 'fake-indexeddb';

global.IS_REACT_ACT_ENVIRONMENT = true;
global.indexedDB = mockIndexedDB;
