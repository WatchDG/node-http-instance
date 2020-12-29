# http-instance

http-instance

```ts
import {HttpInstance} from 'http-instance';

(async () => {
    const instance = new HttpInstance({
        baseURL: 'http://google.com'
    });
    const {status, headers, data} = (await instance.get('/')).unwrap();
})();
```
