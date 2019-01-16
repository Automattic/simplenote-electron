import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import mockIndexedDB from 'fake-indexeddb';

Enzyme.configure({ adapter: new Adapter() });

global.indexedDB = mockIndexedDB;
