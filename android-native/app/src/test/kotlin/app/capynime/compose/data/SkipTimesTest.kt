package app.capynime.compose.data

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class SkipTimesTest {
    @Test fun episodeNumberHandlesSourceLabelsAndSpecials() {
        assertEquals(1.0, SkipTimesRepository.episodeNumberOf("01")!!, 0.0)
        assertEquals(13.5, SkipTimesRepository.episodeNumberOf("Tập 13.5")!!, 0.0)
        assertEquals(2.0, SkipTimesRepository.episodeNumberOf("tẬp02")!!, 0.0)
        for (label in listOf("Full", "OVA", "0", "-1", "", "NaN", "Infinity"))
            assertNull(label, SkipTimesRepository.episodeNumberOf(label))
    }

    @Test fun searchNamesPreferAliasesDeduplicateAndBoundRequests() {
        assertEquals(listOf("Attack on Titan", "Shingeki no Kyojin", "Đại chiến Titan"),
            SkipTimesRepository.searchNames("Đại chiến Titan", "Attack on Titan; Shingeki no Kyojin|Attack on Titan"))
        assertEquals(4, SkipTimesRepository.searchNames("Title", "One,Two,Three,Four,Five").size)
    }

    @Test fun titleMatchingNormalizesAccentsSeasonNamesAndNativeScript() {
        assertEquals("dai chien season 2", SkipTimesRepository.normalize("Đại Chiến: 2nd Season!"))
        assertEquals("進撃の巨人", SkipTimesRepository.normalize("進撃の巨人"))
        assertEquals(4, SkipTimesRepository.pickMalId(listOf("Đại Chiến Season 2"), 2026,
            JSONArray().put(media(4, "Dai Chien: 2nd Season", 2026))))
    }

    @Test fun fuzzyTitlesAndWrongYearsNeverProduceSkips() {
        assertNull(SkipTimesRepository.pickMalId(listOf("Naruto"), 2002,
            JSONArray().put(media(1, "Naruto Shippuden", 2002)).put(media(2, "Naruto", 2007))))
    }

    @Test fun exactYearWinsOverUnknownYearAndMissingMalId() {
        assertEquals(3, SkipTimesRepository.pickMalId(listOf("Show"), 2026,
            JSONArray().put(media(1, "Show", null)).put(media(0, "Show", 2026)).put(media(3, "Show", 2026))))
    }

    @Test fun synonymsCanConfirmTitleButPartialSynonymsCannot() {
        val match = media(9, "Japanese Name", 2026).put("synonyms", JSONArray().put("English Show"))
        assertEquals(9, SkipTimesRepository.pickMalId(listOf("English Show"), 2026, JSONArray().put(match)))
        assertNull(SkipTimesRepository.pickMalId(listOf("English"), 2026, JSONArray().put(match)))
    }

    @Test fun mixedTypesUseFirstValidOpeningAndEnding() {
        val data = JSONArray().put(interval("recap", 0.0, 10.0)).put(interval("mixed-op", 20.0, 110.0))
            .put(interval("op", 30.0, 120.0)).put(interval("mixed-ed", 1330.0, 1420.0))
        assertEquals(SkipTimes(SkipInterval(20.0, 110.0), SkipInterval(1330.0, 1420.0)), SkipTimesRepository.parseTimes(data, 1440.0))
    }

    @Test fun malformedAndOutOfCutIntervalsAreRejected() {
        val data = JSONArray().put(interval("op", -1.0, 90.0)).put(interval("op", 90.0, 40.0))
            .put(interval("ed", 1300.0, 1500.0)).put(JSONObject().put("skipType", "op").put("interval", JSONObject()))
        assertEquals(SkipTimes(), SkipTimesRepository.parseTimes(data, 1440.0))
        assertEquals(SkipTimes(), SkipTimesRepository.parseTimes(JSONArray().put(interval("op", 0.0, 90.0)), Double.NaN))
    }

    @Test fun openingOnlyShowsInsideConfirmedIntervalWithTwoSecondTailGuard() {
        val times = SkipTimes(op = SkipInterval(20.0, 110.0))
        assertNull(times.openingAt(19.9))
        assertNotNull(times.openingAt(20.0))
        assertNotNull(times.openingAt(107.9))
        assertNull(times.openingAt(108.0))
        assertNull(times.openingAt(300.0))
    }

    @Test fun endingOnlyAdvancesForCreditsNearThisCutsEnd() {
        assertTrue(SkipTimes(ed = SkipInterval(1330.0, 1420.0)).inEnding(1331.0, 1440.0))
        assertFalse(SkipTimes(ed = SkipInterval(1330.0, 1420.0)).inEnding(1329.0, 1440.0))
        assertFalse(SkipTimes(ed = SkipInterval(900.0, 990.0)).inEnding(950.0, 1440.0))
        assertFalse(SkipTimes(ed = SkipInterval(1330.0, 1420.0)).inEnding(Double.NaN, 1440.0))
    }

    private fun media(id: Int, title: String, year: Int?) = JSONObject().put("idMal", id)
        .put("seasonYear", year ?: JSONObject.NULL).put("title", JSONObject().put("romaji", title))
    private fun interval(type: String, start: Double, end: Double) = JSONObject().put("skipType", type)
        .put("interval", JSONObject().put("startTime", start).put("endTime", end))
}
