import mockIndexedDB from 'fake-indexeddb';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
global.indexedDB = mockIndexedDB;
