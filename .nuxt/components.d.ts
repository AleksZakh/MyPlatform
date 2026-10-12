
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const ConfirmDialog: typeof import("../app/components/ConfirmDialog.vue")['default']
export const CustomDateInput: typeof import("../app/components/CustomDateInput.vue")['default']
export const DepartmentCard: typeof import("../app/components/DepartmentCard.vue")['default']
export const Footer: typeof import("../app/components/Footer.vue")['default']
export const ResizableTable: typeof import("../app/components/ResizableTable.vue")['default']
export const Toast: typeof import("../app/components/Toast.vue")['default']
export const AdminAccessMatrix: typeof import("../app/components/admin/AccessMatrix.vue")['default']
export const AdminDepartmentMemberPicker: typeof import("../app/components/admin/DepartmentMemberPicker.vue")['default']
export const AdminDomainGroupImport: typeof import("../app/components/admin/DomainGroupImport.vue")['default']
export const AdminUserDirectory: typeof import("../app/components/admin/UserDirectory.vue")['default']
export const AuthRegistrationRequestForm: typeof import("../app/components/auth/RegistrationRequestForm.vue")['default']
export const ChatLauncher: typeof import("../app/components/chat/Launcher.vue")['default']
export const LabDeletionJournal: typeof import("../app/components/lab/DeletionJournal.vue")['default']
export const LabDocumentUploadField: typeof import("../app/components/lab/DocumentUploadField.vue")['default']
export const LabEventJournal: typeof import("../app/components/lab/EventJournal.vue")['default']
export const LabExportRecordsModal: typeof import("../app/components/lab/ExportRecordsModal.vue")['default']
export const LabFileSystem: typeof import("../app/components/lab/FileSystem.vue")['default']
export const LabFileViewerModal: typeof import("../app/components/lab/FileViewerModal.vue")['default']
export const LabFilterPanelModal: typeof import("../app/components/lab/FilterPanelModal.vue")['default']
export const LabFilterSavePopover: typeof import("../app/components/lab/FilterSavePopover.vue")['default']
export const LabManufacturersForm: typeof import("../app/components/lab/ManufacturersForm.vue")['default']
export const LabMaterialsForm: typeof import("../app/components/lab/MaterialsForm.vue")['default']
export const LabObjectsForm: typeof import("../app/components/lab/ObjectsForm.vue")['default']
export const LabPlpForm: typeof import("../app/components/lab/PlpForm.vue")['default']
export const LabReceiptMaterialForm: typeof import("../app/components/lab/ReceiptMaterialForm.vue")['default']
export const LabSamplingForm: typeof import("../app/components/lab/SamplingForm.vue")['default']
export const LabTableSettingsModal: typeof import("../app/components/lab/TableSettingsModal.vue")['default']
export const LabTestReportForm: typeof import("../app/components/lab/TestReportForm.vue")['default']
export const LabCreateModal: typeof import("../app/components/lab/createModal.vue")['default']
export const LabHandbook: typeof import("../app/components/lab/handbook.vue")['default']
export const LabIncominginspection: typeof import("../app/components/lab/incominginspection.vue")['default']
export const LabResearch: typeof import("../app/components/lab/research.vue")['default']
export const LabViewModal: typeof import("../app/components/lab/viewModal.vue")['default']
export const NavigateTopnav: typeof import("../app/components/navigate/topnav.vue")['default']
export const NavigationAdminCacheControl: typeof import("../app/components/navigation/AdminCacheControl.vue")['default']
export const NavigationAppNavigation: typeof import("../app/components/navigation/AppNavigation.vue")['default']
export const SidebarMenuData: typeof import("../app/components/sidebar/menu.data")['default']
export const SidebarMenu: typeof import("../app/components/sidebar/menu.vue")['default']
export const UiTableSettings: typeof import("../app/components/ui/Table/settings.vue")['default']
export const UiTable: typeof import("../app/components/ui/Table/table.vue")['default']
export const UiTableTitle: typeof import("../app/components/ui/Table/title.vue")['default']
export const UInputRating: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/InputRating.vue")['default']
export const UProgressGroup: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/ProgressGroup.vue")['default']
export const USplitter: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/Splitter.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-announcer")['default']
export const NuxtImg: typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']
export const NuxtPicture: typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']
export const ColorScheme: typeof import("../node_modules/@nuxtjs/color-mode/dist/runtime/component.vue")['default']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const Icon: typeof import("../node_modules/@nuxt/icon/dist/runtime/components/index")['default']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyConfirmDialog: LazyComponent<typeof import("../app/components/ConfirmDialog.vue")['default']>
export const LazyCustomDateInput: LazyComponent<typeof import("../app/components/CustomDateInput.vue")['default']>
export const LazyDepartmentCard: LazyComponent<typeof import("../app/components/DepartmentCard.vue")['default']>
export const LazyFooter: LazyComponent<typeof import("../app/components/Footer.vue")['default']>
export const LazyResizableTable: LazyComponent<typeof import("../app/components/ResizableTable.vue")['default']>
export const LazyToast: LazyComponent<typeof import("../app/components/Toast.vue")['default']>
export const LazyAdminAccessMatrix: LazyComponent<typeof import("../app/components/admin/AccessMatrix.vue")['default']>
export const LazyAdminDepartmentMemberPicker: LazyComponent<typeof import("../app/components/admin/DepartmentMemberPicker.vue")['default']>
export const LazyAdminDomainGroupImport: LazyComponent<typeof import("../app/components/admin/DomainGroupImport.vue")['default']>
export const LazyAdminUserDirectory: LazyComponent<typeof import("../app/components/admin/UserDirectory.vue")['default']>
export const LazyAuthRegistrationRequestForm: LazyComponent<typeof import("../app/components/auth/RegistrationRequestForm.vue")['default']>
export const LazyChatLauncher: LazyComponent<typeof import("../app/components/chat/Launcher.vue")['default']>
export const LazyLabDeletionJournal: LazyComponent<typeof import("../app/components/lab/DeletionJournal.vue")['default']>
export const LazyLabDocumentUploadField: LazyComponent<typeof import("../app/components/lab/DocumentUploadField.vue")['default']>
export const LazyLabEventJournal: LazyComponent<typeof import("../app/components/lab/EventJournal.vue")['default']>
export const LazyLabExportRecordsModal: LazyComponent<typeof import("../app/components/lab/ExportRecordsModal.vue")['default']>
export const LazyLabFileSystem: LazyComponent<typeof import("../app/components/lab/FileSystem.vue")['default']>
export const LazyLabFileViewerModal: LazyComponent<typeof import("../app/components/lab/FileViewerModal.vue")['default']>
export const LazyLabFilterPanelModal: LazyComponent<typeof import("../app/components/lab/FilterPanelModal.vue")['default']>
export const LazyLabFilterSavePopover: LazyComponent<typeof import("../app/components/lab/FilterSavePopover.vue")['default']>
export const LazyLabManufacturersForm: LazyComponent<typeof import("../app/components/lab/ManufacturersForm.vue")['default']>
export const LazyLabMaterialsForm: LazyComponent<typeof import("../app/components/lab/MaterialsForm.vue")['default']>
export const LazyLabObjectsForm: LazyComponent<typeof import("../app/components/lab/ObjectsForm.vue")['default']>
export const LazyLabPlpForm: LazyComponent<typeof import("../app/components/lab/PlpForm.vue")['default']>
export const LazyLabReceiptMaterialForm: LazyComponent<typeof import("../app/components/lab/ReceiptMaterialForm.vue")['default']>
export const LazyLabSamplingForm: LazyComponent<typeof import("../app/components/lab/SamplingForm.vue")['default']>
export const LazyLabTableSettingsModal: LazyComponent<typeof import("../app/components/lab/TableSettingsModal.vue")['default']>
export const LazyLabTestReportForm: LazyComponent<typeof import("../app/components/lab/TestReportForm.vue")['default']>
export const LazyLabCreateModal: LazyComponent<typeof import("../app/components/lab/createModal.vue")['default']>
export const LazyLabHandbook: LazyComponent<typeof import("../app/components/lab/handbook.vue")['default']>
export const LazyLabIncominginspection: LazyComponent<typeof import("../app/components/lab/incominginspection.vue")['default']>
export const LazyLabResearch: LazyComponent<typeof import("../app/components/lab/research.vue")['default']>
export const LazyLabViewModal: LazyComponent<typeof import("../app/components/lab/viewModal.vue")['default']>
export const LazyNavigateTopnav: LazyComponent<typeof import("../app/components/navigate/topnav.vue")['default']>
export const LazyNavigationAdminCacheControl: LazyComponent<typeof import("../app/components/navigation/AdminCacheControl.vue")['default']>
export const LazyNavigationAppNavigation: LazyComponent<typeof import("../app/components/navigation/AppNavigation.vue")['default']>
export const LazySidebarMenuData: LazyComponent<typeof import("../app/components/sidebar/menu.data")['default']>
export const LazySidebarMenu: LazyComponent<typeof import("../app/components/sidebar/menu.vue")['default']>
export const LazyUiTableSettings: LazyComponent<typeof import("../app/components/ui/Table/settings.vue")['default']>
export const LazyUiTable: LazyComponent<typeof import("../app/components/ui/Table/table.vue")['default']>
export const LazyUiTableTitle: LazyComponent<typeof import("../app/components/ui/Table/title.vue")['default']>
export const LazyUInputRating: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/InputRating.vue")['default']>
export const LazyUProgressGroup: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/ProgressGroup.vue")['default']>
export const LazyUSplitter: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/Splitter.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']>
export const LazyColorScheme: LazyComponent<typeof import("../node_modules/@nuxtjs/color-mode/dist/runtime/component.vue")['default']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyIcon: LazyComponent<typeof import("../node_modules/@nuxt/icon/dist/runtime/components/index")['default']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
