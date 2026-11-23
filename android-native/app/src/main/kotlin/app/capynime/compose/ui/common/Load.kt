package app.capynime.compose.ui.common

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import app.capynime.compose.data.BoundedCache

/** Result of loading something from the source */
sealed interface Load<out T> {
    data object Loading : Load<Nothing>
    data class Ok<T>(val value: T, val refreshing: Boolean = false) : Load<T>
    data class Failed(val message: String) : Load<Nothing>
}

/**
 * Answers kept in memory for the session (the web app's TanStack Query cache): a screen opened again shows its
 * data at once and refreshes it in the background once it is older than [staleMs].
 */
object MemoryCache {
    private class Entry(val value: Any?, val at: Long)

    private val entries = BoundedCache<String, Entry>(64)

    @Suppress("UNCHECKED_CAST")
    fun <T> get(key: String): Pair<T, Long>? = entries[key]?.let { it.value as T to it.at }

    fun put(key: String, value: Any?) {
        entries.put(key, Entry(value, System.currentTimeMillis()))
    }

    fun drop(prefix: String) = entries.removeWhere { it.startsWith(prefix) }
}

fun friendly(error: Throwable): String = when {
    error.message.isNullOrBlank() -> "Không tải được dữ liệu, kiểm tra kết nối rồi thử lại."
    error is java.net.UnknownHostException -> "Không có mạng hoặc không tìm thấy nguồn."
    error is java.net.SocketTimeoutException -> "Nguồn phản hồi quá chậm, thử lại nhé."
    else -> error.message!!
}

class Loaded<T>(private val state: MutableState<Load<T>>, private val reload: () -> Unit) {
    val value: Load<T> get() = state.value
    fun retry() = reload()
}

/**
 * Loads [block] once per [key], from the memory cache when fresh. [stale]: an older copy kept on the device
 * (HomeSnapshot), shown while nothing better is on screen, and kept when the fresh load fails.
 */
@Composable
fun <T> rememberLoad(key: String, staleMs: Long = 5 * 60_000, stale: (() -> T?)? = null, block: suspend () -> T): Loaded<T> {
    val state = remember(key) {
        val cached = MemoryCache.get<T>(key)
        mutableStateOf<Load<T>>(if (cached != null) Load.Ok(cached.first) else Load.Loading)
    }
    var attempt by remember(key) { mutableIntStateOf(0) }
    LaunchedEffect(key, attempt) {
        val cached = MemoryCache.get<T>(key)
        if (cached != null && System.currentTimeMillis() - cached.second < staleMs && attempt == 0) return@LaunchedEffect
        val current = state.value
        if (current is Load.Ok) state.value = current.copy(refreshing = true) else state.value = Load.Loading
        val staleCopy = if (current !is Load.Ok && stale != null) launch {
            val old = withContext(Dispatchers.IO) { stale() }
            if (old != null && state.value is Load.Loading) state.value = Load.Ok(old, refreshing = true)
        } else null
        state.value = try {
            // off the main thread: parsing a source page (Jsoup) takes tens of ms and would stall scrolling
            val value = withContext(Dispatchers.Default) { block() }
            MemoryCache.put(key, value)
            Load.Ok(value)
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Throwable) {
            // whatever is on screen by now (the cached or the stale copy) stays rather than an error; offline the
            // request fails before the copy is read, so the copy is waited for first
            staleCopy?.join()
            when (val now = state.value) {
                is Load.Ok -> now.copy(refreshing = false)
                else -> Load.Failed(friendly(e))
            }
        }
    }
    return remember(key) { Loaded(state) { attempt++ } }
}
