<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    // DDEV serves Laravel at the project hostname; Next.js runs on :3000 in local dev.
    if (app()->environment('local')) {
        $base = request()->getSchemeAndHttpHost();

        return redirect("{$base}:3000");
    }

    return view('welcome');
});
