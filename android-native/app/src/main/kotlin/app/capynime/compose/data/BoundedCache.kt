package app.capynime.compose.data

/** Access-ordered session cache. Eviction also releases parsed pages and their image URL lists. */
class BoundedCache<K, V>(private val capacity: Int) {
    init { require(capacity > 0) }
    private val entries = LinkedHashMap<K, V>(capacity, 0.75f, true)

    @Synchronized
    operator fun get(key: K): V? = entries[key]

    @Synchronized
    fun put(key: K, value: V) {
        entries[key] = value
        while (entries.size > capacity) entries.remove(entries.keys.first())
    }

    @Synchronized
    fun removeWhere(predicate: (K) -> Boolean) {
        entries.keys.removeAll(predicate)
    }

    @Synchronized
    fun clear() = entries.clear()
}
