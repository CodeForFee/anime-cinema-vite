package app.capynime.compose.data

import org.junit.Assert.*
import org.junit.Test

class BoundedCacheTest {
    @Test fun evictsLeastRecentlyUsedPage() {
        val cache = BoundedCache<String, Int>(2)
        cache.put("home", 1)
        cache.put("search:a", 2)
        assertEquals(1, cache["home"])
        cache.put("detail", 3)
        assertNull(cache["search:a"])
        assertEquals(1, cache["home"])
        assertEquals(3, cache["detail"])
    }

    @Test fun dropsOnlyPrivateAccountEntries() {
        val cache = BoundedCache<String, String>(4)
        cache.put("account:1", "old account")
        cache.put("notifications:1", "private")
        cache.put("home", "catalog")
        cache.removeWhere { it.startsWith("account:") || it.startsWith("notifications:") }
        assertNull(cache["account:1"])
        assertNull(cache["notifications:1"])
        assertEquals("catalog", cache["home"])
        cache.clear()
        assertNull(cache["home"])
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsUnboundedOrEmptyCapacity() { BoundedCache<String, String>(0) }
}
