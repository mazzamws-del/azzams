package com.azzams.moderator;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.view.ViewGroup;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int SHIFT_EXPORT_REQUEST = 1004;
    private String pendingShiftCsv;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 2101;
    private static final String CHANNEL_ID = "azzams_moderator_orders";
    private int notificationSeq = 5000;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(74, 20, 37));
        getWindow().setNavigationBarColor(Color.rgb(17, 19, 24));
        setupNotifications();

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setTextZoom(100);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        // Required for JavaScript alert()/confirm() dialogs used by order actions.
        webView.setWebChromeClient(new WebChromeClient());

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
                if ("file".equals(scheme) || "about".equals(scheme)) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "تعذر فتح الرابط", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    private void setupNotifications() {
        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Azzams Moderator",
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("تحديثات أوردرات الموديريتور");
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private void showNativeNotification(String title, String body) {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return;

        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder =
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? new Notification.Builder(this, CHANNEL_ID)
                        : new Notification.Builder(this);

        builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title == null || title.isEmpty() ? "Azzams Moderator" : title)
                .setContentText(body == null ? "" : body)
                .setStyle(new Notification.BigTextStyle().bigText(body == null ? "" : body))
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setWhen(System.currentTimeMillis());

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setPriority(Notification.PRIORITY_HIGH);
        }

        manager.notify(notificationSeq++, builder.build());
    }

    private class AndroidBridge {
        @JavascriptInterface
        public void saveShiftCsv(String name, String csv) {
            runOnUiThread(() -> {
                if (!"file:///android_asset/index.html".equals(webView.getUrl()) || csv == null || csv.length() > 5000000) return;
                if (pendingShiftCsv != null) {
                    Toast.makeText(MainActivity.this, "أكمل حفظ التقرير المفتوح أولًا", Toast.LENGTH_LONG).show();
                    return;
                }
                try {
                    pendingShiftCsv = csv;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("text/csv");
                    intent.putExtra(Intent.EXTRA_TITLE, name.replaceAll("[^A-Za-z0-9_.-]", "_"));
                    startActivityForResult(intent, SHIFT_EXPORT_REQUEST);
                } catch (Exception e) {
                    pendingShiftCsv = null;
                    Toast.makeText(MainActivity.this, "تعذر فتح حفظ التقرير", Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void notifyEvent(String title, String body) {
            runOnUiThread(() -> showNativeNotification(title, body));
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == SHIFT_EXPORT_REQUEST) {
            final String csv = pendingShiftCsv;
            pendingShiftCsv = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && csv != null) {
                final Uri destination = data.getData();
                new Thread(() -> {
                    try (java.io.OutputStream stream = getContentResolver().openOutputStream(destination, "wt")) {
                        if (stream == null) throw new java.io.IOException("No output stream");
                        stream.write(csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                        stream.flush();
                        runOnUiThread(() -> Toast.makeText(this, "تم حفظ تقرير الشيفتات", Toast.LENGTH_LONG).show());
                    } catch (Exception e) {
                        runOnUiThread(() -> Toast.makeText(this, "تعذر حفظ التقرير. حاول التصدير مرة أخرى", Toast.LENGTH_LONG).show());
                    }
                }).start();
            }
            return;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "(function(){try{return !!(window.handleAppBack&&window.handleAppBack());}catch(e){return false;}})();",
                    value -> {
                        if ("true".equals(value)) return;
                        if (webView.canGoBack()) webView.goBack();
                        else MainActivity.super.onBackPressed();
                    });
        } else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
