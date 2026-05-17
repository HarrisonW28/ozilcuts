<?php

use App\Http\Controllers\Api\V1\AppointmentAdjustmentRequestApproveController;
use App\Http\Controllers\Api\V1\AppointmentAdjustmentRequestRejectController;
use App\Http\Controllers\Api\V1\AppointmentAdjustmentRequestShowController;
use App\Http\Controllers\Api\V1\AppointmentAdjustmentRequestStoreController;
use App\Http\Controllers\Api\V1\AppointmentAdjustmentRequestWithdrawController;
use App\Http\Controllers\Api\V1\AppointmentAdjustmentSuggestionsController;
use App\Http\Controllers\Api\V1\AppointmentArrivalProximityController;
use App\Http\Controllers\Api\V1\AppointmentArrivalUpdateController;
use App\Http\Controllers\Api\V1\AppointmentCalendarController;
use App\Http\Controllers\Api\V1\AppointmentCalendarLinkController;
use App\Http\Controllers\Api\V1\AppointmentCancelController;
use App\Http\Controllers\Api\V1\AppointmentCustomerAiSummaryController;
use App\Http\Controllers\Api\V1\AppointmentCustomerInsightsController;
use App\Http\Controllers\Api\V1\AppointmentHaircutPhotoIndexController;
use App\Http\Controllers\Api\V1\AppointmentHaircutPhotoStoreController;
use App\Http\Controllers\Api\V1\AppointmentHairProfileShowController;
use App\Http\Controllers\Api\V1\AppointmentIndexController;
use App\Http\Controllers\Api\V1\AppointmentMessageIndexController;
use App\Http\Controllers\Api\V1\AppointmentMessageReadController;
use App\Http\Controllers\Api\V1\AppointmentMessageStoreController;
use App\Http\Controllers\Api\V1\AppointmentOperationalCommunicationAssistController;
use App\Http\Controllers\Api\V1\AppointmentPaymentIntentController;
use App\Http\Controllers\Api\V1\AppointmentQueueIntelligenceController;
use App\Http\Controllers\Api\V1\AppointmentRebookHintController;
use App\Http\Controllers\Api\V1\AppointmentRebookNudgeSnoozeController;
use App\Http\Controllers\Api\V1\AppointmentReminderController;
use App\Http\Controllers\Api\V1\AppointmentRescheduleController;
use App\Http\Controllers\Api\V1\AppointmentReviewStoreController;
use App\Http\Controllers\Api\V1\AppointmentRunningLateController;
use App\Http\Controllers\Api\V1\AppointmentShowController;
use App\Http\Controllers\Api\V1\AppointmentStoreController;
use App\Http\Controllers\Api\V1\AppointmentWalkInStoreController;
use App\Http\Controllers\Api\V1\AdminAuditLogIndexController;
use App\Http\Controllers\Api\V1\AdminProductionSecurityController;
use App\Http\Controllers\Api\V1\AdminSecurityReviewController;
use App\Http\Controllers\Api\V1\AdminShopHeroPosterStoreController;
use App\Http\Controllers\Api\V1\AdminShopHeroVideoDestroyController;
use App\Http\Controllers\Api\V1\AdminShopHeroVideoStoreController;
use App\Http\Controllers\Api\V1\AdminShopInstagramUpdateController;
use App\Http\Controllers\Api\V1\AdminShopLogoDestroyController;
use App\Http\Controllers\Api\V1\AdminShopLogoStoreController;
use App\Http\Controllers\Api\V1\PublicHomeMarketingController;
use App\Http\Controllers\Api\V1\Auth\GoogleOAuthCallbackController;
use App\Http\Controllers\Api\V1\Auth\GoogleOAuthRedirectController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\BarberAnalyticsCompareController;
use App\Http\Controllers\Api\V1\BarberAnalyticsController;
use App\Http\Controllers\Api\V1\BarberAvailabilityManageReplaceController;
use App\Http\Controllers\Api\V1\BarberAvailabilityManageShowController;
use App\Http\Controllers\Api\V1\BarberAvailabilityPublicController;
use App\Http\Controllers\Api\V1\BarberIndexController;
use App\Http\Controllers\Api\V1\BarberManageIndexController;
use App\Http\Controllers\Api\V1\BarberManageStoreController;
use App\Http\Controllers\Api\V1\BarberManageUpdateController;
use App\Http\Controllers\Api\V1\BarberPortfolioController;
use App\Http\Controllers\Api\V1\BarberSelfProfileShowController;
use App\Http\Controllers\Api\V1\BarberShowController;
use App\Http\Controllers\Api\V1\BarberSlotsController;
use App\Http\Controllers\Api\V1\BarberSmartSlotHintsController;
use App\Http\Controllers\Api\V1\BarberTrustController;
use App\Http\Controllers\Api\V1\CurrentUserController;
use App\Http\Controllers\Api\V1\CustomerAnalyticsAggregateController;
use App\Http\Controllers\Api\V1\CustomerAnalyticsShowController;
use App\Http\Controllers\Api\V1\CustomerNextVisitController;
use App\Http\Controllers\Api\V1\CustomerNoteDestroyController;
use App\Http\Controllers\Api\V1\CustomerNoteIndexController;
use App\Http\Controllers\Api\V1\CustomerNoteStoreController;
use App\Http\Controllers\Api\V1\CustomerNoteUpdateController;
use App\Http\Controllers\Api\V1\CustomerPrivacyDeleteController;
use App\Http\Controllers\Api\V1\CustomerPrivacyExportController;
use App\Http\Controllers\Api\V1\CustomerPrivacyShowController;
use App\Http\Controllers\Api\V1\CustomerPrivacyUpdateController;
use App\Http\Controllers\Api\V1\CustomerProfileShowController;
use App\Http\Controllers\Api\V1\CustomerProfileUpdateController;
use App\Http\Controllers\Api\V1\CustomerRelationshipShowController;
use App\Http\Controllers\Api\V1\CustomerRetentionSummaryController;
use App\Http\Controllers\Api\V1\CustomerSelfRelationshipController;
use App\Http\Controllers\Api\V1\CustomerVipUpdateController;
use App\Http\Controllers\Api\V1\CustomerTagDestroyController;
use App\Http\Controllers\Api\V1\CustomerTagIndexController;
use App\Http\Controllers\Api\V1\CustomerTagStoreController;
use App\Http\Controllers\Api\V1\CustomerTagSuggestionsController;
use App\Http\Controllers\Api\V1\CustomerVisitsSummaryController;
use App\Http\Controllers\Api\V1\HaircutPhotoDestroyController;
use App\Http\Controllers\Api\V1\HaircutPhotoShowController;
use App\Http\Controllers\Api\V1\HaircutPhotoUpdateController;
use App\Http\Controllers\Api\V1\HairProfilePhotoDestroyController;
use App\Http\Controllers\Api\V1\HairProfilePhotoShowController;
use App\Http\Controllers\Api\V1\HairProfilePhotoStoreController;
use App\Http\Controllers\Api\V1\HairProfileShowController;
use App\Http\Controllers\Api\V1\HairProfileUpdateController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\NotificationIndexController;
use App\Http\Controllers\Api\V1\NotificationMarkAllReadController;
use App\Http\Controllers\Api\V1\NotificationMarkReadController;
use App\Http\Controllers\Api\V1\NotificationPreferenceShowController;
use App\Http\Controllers\Api\V1\NotificationPreferenceUpdateController;
use App\Http\Controllers\Api\V1\NotificationUnreadCountController;
use App\Http\Controllers\Api\V1\OperationalInsightsController;
use App\Http\Controllers\Api\V1\ShopOperationalIntelligenceController;
use App\Http\Controllers\Api\V1\PaymentConfigController;
use App\Http\Controllers\Api\V1\RetentionReportController;
use App\Http\Controllers\Api\V1\RevenueReportController;
use App\Http\Controllers\Api\V1\RevenueReportCsvController;
use App\Http\Controllers\Api\V1\ServiceIndexController;
use App\Http\Controllers\Api\V1\ServiceManageDestroyController;
use App\Http\Controllers\Api\V1\ServiceManageIndexController;
use App\Http\Controllers\Api\V1\ServiceManageStoreController;
use App\Http\Controllers\Api\V1\ServiceManageUpdateController;
use App\Http\Controllers\Api\V1\ServiceStarterPackStoreController;
use App\Http\Controllers\Api\V1\ShopOnboardingUpdateController;
use App\Http\Controllers\Api\V1\StaffCustomerSearchController;
use App\Http\Controllers\Api\V1\StripeWebhookController;
use App\Http\Controllers\Api\V1\UserIndexController;
use App\Http\Controllers\Api\V1\UserShowController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/public/home-marketing', PublicHomeMarketingController::class)
    ->middleware('throttle:public-api');
Route::get('/payments/config', PaymentConfigController::class)
    ->middleware('throttle:public-api');
Route::post('/stripe/webhook', StripeWebhookController::class)
    ->middleware('throttle:120,1');
Route::get('/services', ServiceIndexController::class)
    ->middleware('throttle:public-api');
Route::get('/barbers', BarberIndexController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers/{user}', BarberShowController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers/{user}/availability', BarberAvailabilityPublicController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers/{user}/slots', BarberSlotsController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers/{user}/smart-slot-hints', BarberSmartSlotHintsController::class)
    ->middleware(['throttle:90,1', 'optional.sanctum']);
Route::get('/barbers/{user}/portfolio', BarberPortfolioController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers/{user}/trust', BarberTrustController::class)
    ->middleware('throttle:60,1');

Route::post('/auth/register', RegisterController::class)
    ->middleware('throttle:auth');
Route::post('/auth/login', LoginController::class)
    ->middleware('throttle:auth');

Route::get('/auth/google/redirect', GoogleOAuthRedirectController::class)
    ->middleware('throttle:20,1');
Route::get('/auth/google/callback', GoogleOAuthCallbackController::class)
    ->middleware('throttle:20,1');

Route::get('/appointments/{appointment}/calendar.ics', AppointmentCalendarController::class)
    ->middleware(['signed', 'throttle:60,1'])
    ->name('appointments.calendar');

Route::get('/hair-profile-photos/{photo}', HairProfilePhotoShowController::class)
    ->middleware(['signed', 'throttle:60,1'])
    ->name('hair-profile-photos.show');

Route::get('/haircut-photos/{photo}', HaircutPhotoShowController::class)
    ->middleware(['signed', 'throttle:60,1'])
    ->name('haircut-photos.show');

Route::middleware(['auth:sanctum', 'throttle:authenticated-api'])->group(function (): void {
    Route::get('/user', CurrentUserController::class);
    Route::post('/auth/logout', LogoutController::class)
        ->middleware('throttle:auth');
    Route::get('/customer/profile', CustomerProfileShowController::class);
    Route::get('/customer/relationship', CustomerSelfRelationshipController::class);
    Route::get('/customer/privacy', CustomerPrivacyShowController::class);
    Route::patch('/customer/privacy', CustomerPrivacyUpdateController::class)
        ->middleware('throttle:30,1');
    Route::get('/customer/privacy/export', CustomerPrivacyExportController::class)
        ->middleware('throttle:6,1');
    Route::post('/customer/privacy/delete-account', CustomerPrivacyDeleteController::class)
        ->middleware('throttle:3,1');
    Route::patch('/customer/profile', CustomerProfileUpdateController::class)
        ->middleware('throttle:30,1');
    Route::get('/customer/next-visit', CustomerNextVisitController::class)
        ->middleware('throttle:60,1');
    Route::get('/customer/retention-summary', CustomerRetentionSummaryController::class)
        ->middleware('throttle:60,1');
    Route::get('/customer/hair-profile', HairProfileShowController::class);
    Route::patch('/customer/hair-profile', HairProfileUpdateController::class)
        ->middleware('throttle:30,1');
    Route::get('/barber/profile', BarberSelfProfileShowController::class);
    Route::get('/operations/live', ShopOperationalIntelligenceController::class)
        ->middleware('throttle:120,1');
    Route::post('/customer/hair-profile/photos', HairProfilePhotoStoreController::class)
        ->middleware('throttle:20,1');
    Route::delete('/customer/hair-profile/photos/{photo}', HairProfilePhotoDestroyController::class)
        ->middleware('throttle:30,1');
    Route::get('/users', UserIndexController::class);
    Route::get('/users/{user}', UserShowController::class);
    Route::get('/manage/barbers', BarberManageIndexController::class);
    Route::post('/manage/barbers', BarberManageStoreController::class)
        ->middleware('throttle:20,1');
    Route::patch('/manage/barbers/{user}/profile', BarberManageUpdateController::class)
        ->middleware('throttle:30,1');
    Route::get('/manage/barbers/{user}/availability', BarberAvailabilityManageShowController::class);
    Route::put('/manage/barbers/{user}/availability', BarberAvailabilityManageReplaceController::class)
        ->middleware('throttle:30,1');
    Route::get('/manage/services', ServiceManageIndexController::class);
    Route::post('/manage/services', ServiceManageStoreController::class)
        ->middleware('throttle:30,1');
    Route::post('/manage/services/starter-pack', ServiceStarterPackStoreController::class)
        ->middleware('throttle:10,1');
    Route::patch('/manage/shop-onboarding', ShopOnboardingUpdateController::class)
        ->middleware('throttle:30,1');
    Route::patch('/manage/services/{service}', ServiceManageUpdateController::class)
        ->middleware('throttle:30,1');
    Route::delete('/manage/services/{service}', ServiceManageDestroyController::class)
        ->middleware('throttle:30,1');
    Route::get('/appointments', AppointmentIndexController::class);
    Route::post('/appointments', AppointmentStoreController::class)
        ->middleware('throttle:20,1');
    Route::post('/appointments/walk-in', AppointmentWalkInStoreController::class)
        ->middleware('throttle:30,1');
    Route::get('/staff/customers/search', StaffCustomerSearchController::class)
        ->middleware('throttle:90,1');
    Route::get('/appointments/{appointment}', AppointmentShowController::class);
    Route::get('/appointments/{appointment}/messages', AppointmentMessageIndexController::class)
        ->middleware('throttle:120,1');
    Route::post('/appointments/{appointment}/messages', AppointmentMessageStoreController::class)
        ->middleware('throttle:45,1');
    Route::post('/appointments/{appointment}/messages/read', AppointmentMessageReadController::class)
        ->middleware('throttle:90,1');
    Route::get('/appointments/{appointment}/visit-thread-assist', AppointmentOperationalCommunicationAssistController::class)
        ->middleware('throttle:45,1');
    Route::get('/appointments/{appointment}/adjustment-suggestions', AppointmentAdjustmentSuggestionsController::class)
        ->middleware('throttle:90,1');
    Route::get('/appointments/{appointment}/adjustment-request', AppointmentAdjustmentRequestShowController::class)
        ->middleware('throttle:90,1');
    Route::post('/appointments/{appointment}/adjustment-request', AppointmentAdjustmentRequestStoreController::class)
        ->middleware('throttle:30,1');
    Route::patch('/appointments/{appointment}/adjustment-request/approve', AppointmentAdjustmentRequestApproveController::class)
        ->middleware('throttle:30,1');
    Route::patch('/appointments/{appointment}/adjustment-request/reject', AppointmentAdjustmentRequestRejectController::class)
        ->middleware('throttle:30,1');
    Route::patch('/appointments/{appointment}/adjustment-request/withdraw', AppointmentAdjustmentRequestWithdrawController::class)
        ->middleware('throttle:30,1');
    Route::get('/appointments/{appointment}/queue-intelligence', AppointmentQueueIntelligenceController::class)
        ->middleware('throttle:60,1');
    Route::get('/appointments/{appointment}/calendar-url', AppointmentCalendarLinkController::class)
        ->middleware('throttle:30,1');
    Route::get('/appointments/{appointment}/payment-intent', AppointmentPaymentIntentController::class)
        ->middleware('throttle:30,1');
    Route::get('/appointments/{appointment}/rebook-hint', AppointmentRebookHintController::class)
        ->middleware('throttle:60,1');
    Route::get('/appointments/{appointment}/hair-profile', AppointmentHairProfileShowController::class)
        ->middleware('throttle:60,1');
    Route::get('/appointments/{appointment}/customer-insights', AppointmentCustomerInsightsController::class)
        ->middleware('throttle:60,1');
    Route::get('/appointments/{appointment}/customer-ai-summary', AppointmentCustomerAiSummaryController::class)
        ->middleware('throttle:20,1');
    Route::get('/customers/{user}/notes', CustomerNoteIndexController::class);
    Route::post('/customers/{user}/notes', CustomerNoteStoreController::class)
        ->middleware('throttle:60,1');
    Route::patch('/customer-notes/{note}', CustomerNoteUpdateController::class)
        ->middleware('throttle:60,1');
    Route::delete('/customer-notes/{note}', CustomerNoteDestroyController::class)
        ->middleware('throttle:60,1');
    Route::get('/customers/{user}/relationship', CustomerRelationshipShowController::class);
    Route::patch('/customers/{user}/relationship/vip', CustomerVipUpdateController::class)
        ->middleware('throttle:60,1');
    Route::get('/customers/{user}/tags', CustomerTagIndexController::class);
    Route::post('/customers/{user}/tags', CustomerTagStoreController::class)
        ->middleware('throttle:60,1');
    Route::delete('/customer-tags/{tag}', CustomerTagDestroyController::class)
        ->middleware('throttle:60,1');
    Route::get('/customer-tags/suggestions', CustomerTagSuggestionsController::class);
    Route::get('/appointments/{appointment}/haircut-photos', AppointmentHaircutPhotoIndexController::class)
        ->middleware('throttle:60,1');
    Route::post('/appointments/{appointment}/haircut-photos', AppointmentHaircutPhotoStoreController::class)
        ->middleware('throttle:30,1');
    Route::patch('/haircut-photos/{photo}', HaircutPhotoUpdateController::class)
        ->middleware('throttle:30,1');
    Route::delete('/haircut-photos/{photo}', HaircutPhotoDestroyController::class)
        ->middleware('throttle:30,1');
    Route::post('/appointments/{appointment}/review', AppointmentReviewStoreController::class)
        ->middleware('throttle:20,1');
    Route::patch('/appointments/{appointment}/cancel', AppointmentCancelController::class)
        ->middleware('throttle:30,1');
    Route::patch('/appointments/{appointment}/reschedule', AppointmentRescheduleController::class)
        ->middleware('throttle:30,1');
    Route::patch('/appointments/{appointment}/arrival', AppointmentArrivalUpdateController::class)
        ->middleware('throttle:60,1');
    Route::post('/appointments/{appointment}/arrival-proximity', AppointmentArrivalProximityController::class)
        ->middleware('throttle:30,1');
    Route::post('/appointments/{appointment}/reminder', AppointmentReminderController::class)
        ->middleware('throttle:30,1');
    Route::post('/appointments/{appointment}/running-late', AppointmentRunningLateController::class)
        ->middleware('throttle:30,1');
    Route::post('/appointments/{appointment}/rebook-nudge/snooze', AppointmentRebookNudgeSnoozeController::class)
        ->middleware('throttle:30,1');
    Route::get('/admin/audit-logs', AdminAuditLogIndexController::class)
        ->middleware('throttle:60,1');
    Route::get('/admin/security-review', AdminSecurityReviewController::class)
        ->middleware('throttle:30,1');
    Route::get('/admin/production-security', AdminProductionSecurityController::class)
        ->middleware('throttle:20,1');
    Route::post('/admin/marketing/logo', AdminShopLogoStoreController::class)
        ->middleware('throttle:10,1');
    Route::delete('/admin/marketing/logo', AdminShopLogoDestroyController::class)
        ->middleware('throttle:10,1');
    Route::patch('/admin/marketing/instagram', AdminShopInstagramUpdateController::class)
        ->middleware('throttle:30,1');
    Route::post('/admin/marketing/hero-video', AdminShopHeroVideoStoreController::class)
        ->middleware('throttle:10,1');
    Route::post('/admin/marketing/hero-poster', AdminShopHeroPosterStoreController::class)
        ->middleware('throttle:10,1');
    Route::delete('/admin/marketing/hero-video', AdminShopHeroVideoDestroyController::class)
        ->middleware('throttle:10,1');
    Route::get('/admin/reports/revenue', RevenueReportController::class)
        ->middleware('throttle:60,1');
    Route::get('/admin/reports/revenue.csv', RevenueReportCsvController::class)
        ->middleware('throttle:30,1');
    Route::get('/admin/reports/barbers', BarberAnalyticsCompareController::class)
        ->middleware('throttle:60,1');
    Route::get('/admin/reports/customers', CustomerAnalyticsAggregateController::class)
        ->middleware('throttle:60,1');
    Route::get('/admin/customers/{user}/analytics', CustomerAnalyticsShowController::class)
        ->middleware('throttle:60,1');
    Route::get('/admin/reports/operations', OperationalInsightsController::class)
        ->middleware('throttle:60,1');
    Route::get('/admin/reports/retention', RetentionReportController::class)
        ->middleware('throttle:60,1');
    Route::get('/notifications', NotificationIndexController::class)
        ->middleware('throttle:120,1');
    Route::get('/notifications/unread-count', NotificationUnreadCountController::class)
        ->middleware('throttle:240,1');
    Route::patch('/notifications/read-all', NotificationMarkAllReadController::class)
        ->middleware('throttle:30,1');
    Route::patch('/notifications/{notification}/read', NotificationMarkReadController::class)
        ->middleware('throttle:120,1');
    Route::get('/notification-preferences', NotificationPreferenceShowController::class)
        ->middleware('throttle:60,1');
    Route::put('/notification-preferences', NotificationPreferenceUpdateController::class)
        ->middleware('throttle:30,1');
    Route::get('/customer/visits', CustomerVisitsSummaryController::class)
        ->middleware('throttle:60,1');
    Route::get('/barbers/{user}/analytics', BarberAnalyticsController::class)
        ->middleware('throttle:60,1');
});
