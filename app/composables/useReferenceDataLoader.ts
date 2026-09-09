export function useReferenceDataLoader() {
    const { showTost } = useAppToasts();    
    // Метод для загрузки справочников
    async function loadReference() {
        try {
            const response = await Promise.all([
                $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'plp', field: 'name' } }),
                $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'testObject', field: 'name' } }),
                $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'inspector', field: 'name' } }),
                $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'material', field: 'name' } }),
                $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'manufacturer', field: 'name' } }),
            ]);
            
            // console.log('Reference data response = ', response);
            return response;
            
        } catch (error) {
            console.error('Ошибка загрузки справочников:', error);
            showTost('Ошибка!', 'Не удалось загрузить справочные данные', 'error', 'fxemoji:warningsign', 5000);
            return null;
        }
    }
    
    // Возвращаем объект с методом
    return {
        loadReference,
        // Можно добавить другие методы при необходимости
    };
}