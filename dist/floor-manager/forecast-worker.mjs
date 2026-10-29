import {forecast} from './operations.mjs?v=four-days-11';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,forecast:forecast(data.cafe)})}catch(e){self.postMessage({id:data.id,error:e.message})}};
