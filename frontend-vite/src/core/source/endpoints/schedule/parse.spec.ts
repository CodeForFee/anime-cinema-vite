import { expect, test } from "vitest";
import { filmIdOf, parseUser } from "@/core/source/endpoints/comments/fetch";
import Schedule from "@/core/source/endpoints/schedule/parse";

test("schedule: one entry per day with each title's air time", () => {
  const html = `<section class="Homeschedule"><div class="Top"><h1><b>Chủ Nhật</b>, Ngày 25 tháng 10</h1></div>
    <ul><li class="TPostMv"><article class="TPost C"><a href="https://animevietsub.sale/phim/tien-nghich-a5085/">
    <div class="Image"><figure><img src="https://cdn.animevietsub.sale/a.jpg"></figure>
    <span class="mli-timeschedule" data-timer_second="100">1d</span><span class="b">8 giờ 05 phút</span></div>
    <h2 class="Title">Tiên Nghịch</h2></a></article></li></ul></section>
    <section class="Homeschedule"><div class="Top"><h1><b>Thứ Hai</b>, Ngày 26 tháng 10</h1></div><ul></ul></section>`;
  const days = Schedule(html);
  expect(days.map((d) => d.day)).toEqual(["Chủ Nhật, Ngày 25 tháng 10", "Thứ Hai, Ngày 26 tháng 10"]);
  expect(days[0].items[0]).toMatchObject({ name: "Tiên Nghịch", path: "/phim/tien-nghich-a5085/", airTime: "08:05" });
  expect(days[1].items).toEqual([]);
});

test("comment box setup tells who is signed in", () => {
  expect(parseUser(`AvsComment.init({ isLogin: false, userFullName: "" })`)).toBeNull();
  expect(
    parseUser(`isLogin: true, userId: 42, userName: "a", userFullName: "Gấu \\"Myz0\\"", userAvatar: "https:\\/\\/cdn.x\\/u.jpg",`),
  ).toEqual({ id: 42, name: 'Gấu "Myz0"', avatar: "https://cdn.x/u.jpg" });
  expect(filmIdOf("hotaru-no-yomeiri-a6134")).toBe(6134);
});
