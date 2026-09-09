import { defineStore,createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import type { ITableFilter } from '@@/types/tableFilter'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// Функция возвращает чистый объект начального состояния со всеми полями
const createDefaultFilter = (): ITableFilter => ({
  plp: null,
  objName: null,
  samplActNumber: null,
  sDateStart: null,
  sDateEnd: null,
  sPlace: null,
  sProvaider: null,
  // ----------------------------
  receiveDateStart: null,
  receiveDateEnd: null,
  materialName: null,
  qualiDateStart: null,
  qualiDateEnd: null,
  qualiDocNumber: null,
  manufacturer: null,
  // ----------------------------
  testReportDataStart: null,
  testReportDataEnd: null,
  testResult: null,
  testProtocolNumber: null
});

export const useTableFilterStore = defineStore('tableFilter', {
    // 1. СТЕЙТ (Хранилище данных в оперативной памяти)
    state: () => ({
        filter: createDefaultFilter(),
        isLoaded: false // Флаг готовности данных из localStorage
    }),
    // persist: true,

    // Включаем сохранение состояния через куки для Nuxt SSR
    persist: {
        key: 'lab_reestrTable_filter', // Имя куки в браузере
    },
    
    // 2. ГЕТТЕРЫ (Вычисляемые свойства для анализа состояния)
    getters: {
        /**
         * Проверяет, активен ли хотя бы один фильтр на форме.
         * Используется для того, чтобы показывать кнопку "Сбросить фильтры".
         */
        isFilterActive: (state) => {
            return Object.values(state.filter).some(value => value !== null)
        },

        /**
         * Возвращает количество активных фильтров.
         * Используется для отображения бейджа с числом активных фильтров.
         */
        getActiveFiltersCount: (state) => {
            return Object.values(state.filter).filter(value => value !== null).length
        },

        /**
         * Возвращает описание активных фильтров в виде строки.
         * Используется для отображения информации о примененных фильтрах.
         */
        getFilterDescription: (state) => {
            const descriptions: string[] = [];
            const filter = state.filter;
            
            if (filter.plp) descriptions.push(`ПЛП: ${filter.plp}`);
            if (filter.objName) descriptions.push(`Объект: ${filter.objName}`);
            if (filter.samplActNumber) descriptions.push(`№ акта: ${filter.samplActNumber}`);
            if (filter.sPlace) descriptions.push(`Место: ${filter.sPlace}`);
            if (filter.sProvaider) descriptions.push(`Инспектор: ${filter.sProvaider}`);
            if (filter.materialName) descriptions.push(`Материал: ${filter.materialName}`);
            if (filter.manufacturer) descriptions.push(`Производитель: ${filter.manufacturer}`);
            if (filter.testResult) descriptions.push(`Результат: ${filter.testResult}`);
            if (filter.testProtocolNumber) descriptions.push(`№ протокола: ${filter.testProtocolNumber}`);
            
            // Даты
            if (filter.sDateStart && filter.sDateEnd) {
                descriptions.push(`Дата отбора: с ${filter.sDateStart} по ${filter.sDateEnd}`);
            } else if (filter.sDateStart) {
                descriptions.push(`Дата отбора: с ${filter.sDateStart}`);
            } else if (filter.sDateEnd) {
                descriptions.push(`Дата отбора: до ${filter.sDateEnd}`);
            }
            
            if (filter.receiveDateStart && filter.receiveDateEnd) {
                descriptions.push(`Дата поступления: с ${filter.receiveDateStart} по ${filter.receiveDateEnd}`);
            } else if (filter.receiveDateStart) {
                descriptions.push(`Дата поступления: с ${filter.receiveDateStart}`);
            } else if (filter.receiveDateEnd) {
                descriptions.push(`Дата поступления: до ${filter.receiveDateEnd}`);
            }
            
            if (filter.qualiDateStart && filter.qualiDateEnd) {
                descriptions.push(`Дата документа: с ${filter.qualiDateStart} по ${filter.qualiDateEnd}`);
            } else if (filter.qualiDateStart) {
                descriptions.push(`Дата документа: с ${filter.qualiDateStart}`);
            } else if (filter.qualiDateEnd) {
                descriptions.push(`Дата документа: до ${filter.qualiDateEnd}`);
            }
            
            if (filter.testReportDataStart && filter.testReportDataEnd) {
                descriptions.push(`Дата протокола: с ${filter.testReportDataStart} по ${filter.testReportDataEnd}`);
            } else if (filter.testReportDataStart) {
                descriptions.push(`Дата протокола: с ${filter.testReportDataStart}`);
            } else if (filter.testReportDataEnd) {
                descriptions.push(`Дата протокола: до ${filter.testReportDataEnd}`);
            }
            
            return descriptions;
        }
    },

    // 3. ЭКШЕНЫ (Сеттеры и методы управления состоянием)
    actions: {
        /**
         * Частичное или полное обновление полей фильтра.
         * Позволяет обновлять как одно поле, так и пачку полей сразу.
         */
        setFilter(newFilter: Partial<ITableFilter>) {
            this.filter = { ...this.filter, ...newFilter }
            // this.saveToStorage()
        },

        /**
         * Полный сброс всех фильтров в начальное состояние (null)
         */
        resetFilter() {
            this.filter = createDefaultFilter()
            // this.saveToStorage()
        },

        /**
         * Сохранение текущего состояния фильтра в физический localStorage браузера
         */
        // saveToStorage() {
        //     if (process.client) {
        //         localStorage.setItem('lab_reestrTable_filter', JSON.stringify(this.filter))
        //     }
        // },

        /**
         * Загрузка сохраненных настроек фильтра при старте страницы
         */
        // loadFromStorage() {
        //     if (process.client) {
        //         const saved = localStorage.getItem('lab_reestrTable_filter')
        //         if (saved) {
        //             try {
        //                 // Парсим данные и мягко объединяем с дефолтным фильтром,
        //                 // на случай, если в будущем вы добавите новые поля в интерфейс
        //                 const parsed = JSON.parse(saved)
        //                 this.filter = { ...createDefaultFilter(), ...parsed }
        //             } catch (e) {
        //                 console.error('Ошибка восстановления фильтра из localStorage:', e)
        //             }
        //         }
        //         this.isLoaded = true
        //     }
        // },

        /**
         * Проверяет, активен ли конкретный фильтр по ключу
         */
        isFilterActiveByKey(key: keyof ITableFilter): boolean {
            return this.filter[key] !== null && this.filter[key] !== undefined && this.filter[key] !== ''
        },

        /**
         * Возвращает массив активных фильтров с их ключами и значениями
         */
        getActiveFilters(): Array<{ key: string; value: any }> {
            return Object.entries(this.filter)
                .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                .map(([key, value]) => ({ key, value }))
        }
    }
})