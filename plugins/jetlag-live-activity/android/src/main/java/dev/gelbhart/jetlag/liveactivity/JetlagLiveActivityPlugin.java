package dev.gelbhart.jetlag.liveactivity

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "JetlagLiveActivity")
class JetlagLiveActivityPlugin : Plugin() {
    private val channelId = "jetlag_session"
    private val channelName = "Jet Lag session"

    override fun load() {
        createChannel()
    }

    @PluginMethod
    fun startQuestionActivity(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun updateQuestionActivity(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun endQuestionActivity(call: PluginCall) {
        dismissNotification(ONGOING_QUESTION_ID)
        call.resolve()
    }

    @PluginMethod
    fun startSessionTimerActivity(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun updateSessionTimerActivity(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun endSessionTimerActivity(call: PluginCall) {
        dismissNotification(ONGOING_TIMER_ID)
        call.resolve()
    }

    @PluginMethod
    fun showOngoingNotification(call: PluginCall) {
        val id = call.getInt("id") ?: ONGOING_QUESTION_ID
        val title = call.getString("title") ?: "Jet Lag"
        val body = call.getString("body") ?: ""
        val ongoing = call.getBoolean("ongoing", true) ?: true

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle(title)
            .setContentText(body)
            .setOngoing(ongoing)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        notificationManager.notify(id, notification)
        call.resolve()
    }

    @PluginMethod
    fun dismissOngoingNotification(call: PluginCall) {
        val id = call.getInt("id") ?: ONGOING_QUESTION_ID
        dismissNotification(id)
        call.resolve()
    }

    private fun dismissNotification(id: Int) {
        notificationManager.cancel(id)
    }

    private val notificationManager: NotificationManager
        get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val channel = NotificationChannel(
            channelId,
            channelName,
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Active Jet Lag session timers and question deadlines"
            setShowBadge(false)
        }
        notificationManager.createNotificationChannel(channel)
    }

    companion object {
        const val ONGOING_QUESTION_ID = 1001
        const val ONGOING_TIMER_ID = 1002
    }
}
