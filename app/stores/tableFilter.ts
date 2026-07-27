import { defineStore } from 'pinia'
import type { ITableFilter } from '@@/types/tableFilter'

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
    
    // 2. ГЕТТЕРЫ (Вычисляемые свойства для анализа состояния)
    getters: {
        /**
         * Проверяет, активен ли хотя бы один фильтр на форме.
         * Используется для того, чтобы показывать кнопку "Сбросить фильтры".
         */
        isFilterActive: (state) => {
            return Object.values(state.filter).some(value => value !== null)
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
            this.saveToStorage()
        },

        /**
         * Полный сброс всех фильтров в начальное состояние (null)
         */
        resetFilter() {
            this.filter = createDefaultFilter()
            this.saveToStorage()
        },

        /**
         * Сохранение текущего состояния фильтра в физический localStorage браузера
         */
        saveToStorage() {
            if (process.client) {
                localStorage.setItem('lab_reestrTable_filter', JSON.stringify(this.filter))
            }
        },

        /**
         * Загрузка сохраненных настроек фильтра при старте страницы
         */
        loadFromStorage() {
            if (process.client) {
                const saved = localStorage.getItem('lab_reestrTable_filter')
                if (saved) {
                    try {
                        // Парсим данные и мягко объединяем с дефолтным фильтром,
                        // на случай, если в будущем вы добавите новые поля в интерфейс
                        const parsed = JSON.parse(saved)
                        this.filter = { ...createDefaultFilter(), ...parsed }
                    } catch (e) {
                        console.error('Ошибка восстановления фильтра из localStorage:', e)
                    }
                }
                this.isLoaded = true
            }
        }
    }
})