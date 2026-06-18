// server/api/ad/get-groups.get.ts
import ActiveDirectory from 'activedirectory2';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  
  const adConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout
  };
  
  const ad = new ActiveDirectory(adConfig);
  
  return new Promise((resolve, reject) => {
    // Поиск всех групп
    const groupOptions = {
      filter: '(objectClass=group)',           // Только объекты групп
      scope: 'sub',
      sizeLimit: 200,
      attributes: ['cn', 'description', 'member']
    };
    
    ad.findGroups(groupOptions as any, (err, groups) => {
      if (err) {
        const error = err as any;
        reject({ success: false, error: error.message });
      } else {
        console.log(`Найдено групп: ${groups?.length || 0}`);
        resolve({
          success: true,
          count: groups?.length || 0,
          groups: groups || []
        });
      }
    });
  });
});