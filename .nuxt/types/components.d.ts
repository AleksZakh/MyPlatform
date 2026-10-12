
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

interface _GlobalComponents {
  ConfirmDialog: typeof import("../../app/components/ConfirmDialog.vue")['default']
  CustomDateInput: typeof import("../../app/components/CustomDateInput.vue")['default']
  DepartmentCard: typeof import("../../app/components/DepartmentCard.vue")['default']
  Footer: typeof import("../../app/components/Footer.vue")['default']
  ResizableTable: typeof import("../../app/components/ResizableTable.vue")['default']
  Toast: typeof import("../../app/components/Toast.vue")['default']
  AdminAccessMatrix: typeof import("../../app/components/admin/AccessMatrix.vue")['default']
  AdminDepartmentMemberPicker: typeof import("../../app/components/admin/DepartmentMemberPicker.vue")['default']
  AdminDomainGroupImport: typeof import("../../app/components/admin/DomainGroupImport.vue")['default']
  AdminUserDirectory: typeof import("../../app/components/admin/UserDirectory.vue")['default']
  AuthRegistrationRequestForm: typeof import("../../app/components/auth/RegistrationRequestForm.vue")['default']
  ChatLauncher: typeof import("../../app/components/chat/Launcher.vue")['default']
  LabDeletionJournal: typeof import("../../app/components/lab/DeletionJournal.vue")['default']
  LabDocumentUploadField: typeof import("../../app/components/lab/DocumentUploadField.vue")['default']
  LabEventJournal: typeof import("../../app/components/lab/EventJournal.vue")['default']
  LabExportRecordsModal: typeof import("../../app/components/lab/ExportRecordsModal.vue")['default']
  LabFileSystem: typeof import("../../app/components/lab/FileSystem.vue")['default']
  LabFileViewerModal: typeof import("../../app/components/lab/FileViewerModal.vue")['default']
  LabFilterPanelModal: typeof import("../../app/components/lab/FilterPanelModal.vue")['default']
  LabFilterSavePopover: typeof import("../../app/components/lab/FilterSavePopover.vue")['default']
  LabManufacturersForm: typeof import("../../app/components/lab/ManufacturersForm.vue")['default']
  LabMaterialsForm: typeof import("../../app/components/lab/MaterialsForm.vue")['default']
  LabObjectsForm: typeof import("../../app/components/lab/ObjectsForm.vue")['default']
  LabPlpForm: typeof import("../../app/components/lab/PlpForm.vue")['default']
  LabReceiptMaterialForm: typeof import("../../app/components/lab/ReceiptMaterialForm.vue")['default']
  LabSamplingForm: typeof import("../../app/components/lab/SamplingForm.vue")['default']
  LabTableSettingsModal: typeof import("../../app/components/lab/TableSettingsModal.vue")['default']
  LabTestReportForm: typeof import("../../app/components/lab/TestReportForm.vue")['default']
  LabCreateModal: typeof import("../../app/components/lab/createModal.vue")['default']
  LabHandbook: typeof import("../../app/components/lab/handbook.vue")['default']
  LabIncominginspection: typeof import("../../app/components/lab/incominginspection.vue")['default']
  LabResearch: typeof import("../../app/components/lab/research.vue")['default']
  LabViewModal: typeof import("../../app/components/lab/viewModal.vue")['default']
  NavigateTopnav: typeof import("../../app/components/navigate/topnav.vue")['default']
  NavigationAdminCacheControl: typeof import("../../app/components/navigation/AdminCacheControl.vue")['default']
  NavigationAppNavigation: typeof import("../../app/components/navigation/AppNavigation.vue")['default']
  SidebarMenuData: typeof import("../../app/components/sidebar/menu.data")['default']
  SidebarMenu: typeof import("../../app/components/sidebar/menu.vue")['default']
  UiTableSettings: typeof import("../../app/components/ui/Table/settings.vue")['default']
  UiTable: typeof import("../../app/components/ui/Table/table.vue")['default']
  UiTableTitle: typeof import("../../app/components/ui/Table/title.vue")['default']
  UInputRating: typeof import("../../node_modules/@nuxt/ui/dist/runtime/components/InputRating.vue")['default']
  UProgressGroup: typeof import("../../node_modules/@nuxt/ui/dist/runtime/components/ProgressGroup.vue")['default']
  USplitter: typeof import("../../node_modules/@nuxt/ui/dist/runtime/components/Splitter.vue")['default']
  NuxtWelcome: typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']
  NuxtLayout: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  NuxtErrorBoundary: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  ClientOnly: typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']
  DevOnly: typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']
  NuxtLink: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']
  NuxtLoadingIndicator: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  NuxtTime: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  NuxtRouteAnnouncer: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  NuxtAnnouncer: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-announcer")['default']
  NuxtImg: typeof import("../../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']
  NuxtPicture: typeof import("../../node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']
  ColorScheme: typeof import("../../node_modules/@nuxtjs/color-mode/dist/runtime/component.vue")['default']
  NuxtPage: typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']
  NoScript: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']
  Link: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']
  Base: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']
  Title: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']
  Meta: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']
  Style: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']
  Head: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']
  Html: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']
  Body: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']
  Icon: typeof import("../../node_modules/@nuxt/icon/dist/runtime/components/index")['default']
  NuxtIsland: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyConfirmDialog: LazyComponent<typeof import("../../app/components/ConfirmDialog.vue")['default']>
  LazyCustomDateInput: LazyComponent<typeof import("../../app/components/CustomDateInput.vue")['default']>
  LazyDepartmentCard: LazyComponent<typeof import("../../app/components/DepartmentCard.vue")['default']>
  LazyFooter: LazyComponent<typeof import("../../app/components/Footer.vue")['default']>
  LazyResizableTable: LazyComponent<typeof import("../../app/components/ResizableTable.vue")['default']>
  LazyToast: LazyComponent<typeof import("../../app/components/Toast.vue")['default']>
  LazyAdminAccessMatrix: LazyComponent<typeof import("../../app/components/admin/AccessMatrix.vue")['default']>
  LazyAdminDepartmentMemberPicker: LazyComponent<typeof import("../../app/components/admin/DepartmentMemberPicker.vue")['default']>
  LazyAdminDomainGroupImport: LazyComponent<typeof import("../../app/components/admin/DomainGroupImport.vue")['default']>
  LazyAdminUserDirectory: LazyComponent<typeof import("../../app/components/admin/UserDirectory.vue")['default']>
  LazyAuthRegistrationRequestForm: LazyComponent<typeof import("../../app/components/auth/RegistrationRequestForm.vue")['default']>
  LazyChatLauncher: LazyComponent<typeof import("../../app/components/chat/Launcher.vue")['default']>
  LazyLabDeletionJournal: LazyComponent<typeof import("../../app/components/lab/DeletionJournal.vue")['default']>
  LazyLabDocumentUploadField: LazyComponent<typeof import("../../app/components/lab/DocumentUploadField.vue")['default']>
  LazyLabEventJournal: LazyComponent<typeof import("../../app/components/lab/EventJournal.vue")['default']>
  LazyLabExportRecordsModal: LazyComponent<typeof import("../../app/components/lab/ExportRecordsModal.vue")['default']>
  LazyLabFileSystem: LazyComponent<typeof import("../../app/components/lab/FileSystem.vue")['default']>
  LazyLabFileViewerModal: LazyComponent<typeof import("../../app/components/lab/FileViewerModal.vue")['default']>
  LazyLabFilterPanelModal: LazyComponent<typeof import("../../app/components/lab/FilterPanelModal.vue")['default']>
  LazyLabFilterSavePopover: LazyComponent<typeof import("../../app/components/lab/FilterSavePopover.vue")['default']>
  LazyLabManufacturersForm: LazyComponent<typeof import("../../app/components/lab/ManufacturersForm.vue")['default']>
  LazyLabMaterialsForm: LazyComponent<typeof import("../../app/components/lab/MaterialsForm.vue")['default']>
  LazyLabObjectsForm: LazyComponent<typeof import("../../app/components/lab/ObjectsForm.vue")['default']>
  LazyLabPlpForm: LazyComponent<typeof import("../../app/components/lab/PlpForm.vue")['default']>
  LazyLabReceiptMaterialForm: LazyComponent<typeof import("../../app/components/lab/ReceiptMaterialForm.vue")['default']>
  LazyLabSamplingForm: LazyComponent<typeof import("../../app/components/lab/SamplingForm.vue")['default']>
  LazyLabTableSettingsModal: LazyComponent<typeof import("../../app/components/lab/TableSettingsModal.vue")['default']>
  LazyLabTestReportForm: LazyComponent<typeof import("../../app/components/lab/TestReportForm.vue")['default']>
  LazyLabCreateModal: LazyComponent<typeof import("../../app/components/lab/createModal.vue")['default']>
  LazyLabHandbook: LazyComponent<typeof import("../../app/components/lab/handbook.vue")['default']>
  LazyLabIncominginspection: LazyComponent<typeof import("../../app/components/lab/incominginspection.vue")['default']>
  LazyLabResearch: LazyComponent<typeof import("../../app/components/lab/research.vue")['default']>
  LazyLabViewModal: LazyComponent<typeof import("../../app/components/lab/viewModal.vue")['default']>
  LazyNavigateTopnav: LazyComponent<typeof import("../../app/components/navigate/topnav.vue")['default']>
  LazyNavigationAdminCacheControl: LazyComponent<typeof import("../../app/components/navigation/AdminCacheControl.vue")['default']>
  LazyNavigationAppNavigation: LazyComponent<typeof import("../../app/components/navigation/AppNavigation.vue")['default']>
  LazySidebarMenuData: LazyComponent<typeof import("../../app/components/sidebar/menu.data")['default']>
  LazySidebarMenu: LazyComponent<typeof import("../../app/components/sidebar/menu.vue")['default']>
  LazyUiTableSettings: LazyComponent<typeof import("../../app/components/ui/Table/settings.vue")['default']>
  LazyUiTable: LazyComponent<typeof import("../../app/components/ui/Table/table.vue")['default']>
  LazyUiTableTitle: LazyComponent<typeof import("../../app/components/ui/Table/title.vue")['default']>
  LazyUInputRating: LazyComponent<typeof import("../../node_modules/@nuxt/ui/dist/runtime/components/InputRating.vue")['default']>
  LazyUProgressGroup: LazyComponent<typeof import("../../node_modules/@nuxt/ui/dist/runtime/components/ProgressGroup.vue")['default']>
  LazyUSplitter: LazyComponent<typeof import("../../node_modules/@nuxt/ui/dist/runtime/components/Splitter.vue")['default']>
  LazyNuxtWelcome: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  LazyNuxtLayout: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  LazyClientOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']>
  LazyDevOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  LazyNuxtLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  LazyNuxtTime: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  LazyNuxtAnnouncer: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-announcer")['default']>
  LazyNuxtImg: LazyComponent<typeof import("../../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']>
  LazyNuxtPicture: LazyComponent<typeof import("../../node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']>
  LazyColorScheme: LazyComponent<typeof import("../../node_modules/@nuxtjs/color-mode/dist/runtime/component.vue")['default']>
  LazyNuxtPage: LazyComponent<typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']>
  LazyNoScript: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  LazyLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']>
  LazyBase: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']>
  LazyTitle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']>
  LazyMeta: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']>
  LazyStyle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']>
  LazyHead: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']>
  LazyHtml: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']>
  LazyBody: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']>
  LazyIcon: LazyComponent<typeof import("../../node_modules/@nuxt/icon/dist/runtime/components/index")['default']>
  LazyNuxtIsland: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
