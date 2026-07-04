<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminOnly
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::guard('api')->user();
        if (! $user || ! method_exists($user, 'isAdmin') || ! $user->isAdmin()) {
            return response()->json(['message' => 'Acesso restrito a administradores.'], 403);
        }
        return $next($request);
    }
}
