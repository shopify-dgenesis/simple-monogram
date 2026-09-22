import { PrismaClient, FontCategory } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM_FONTS: { name: string; category: FontCategory; family: string }[] = [
  { name: "Playfair Display", category: FontCategory.SERIF, family: "'Playfair Display', serif" },
  { name: "Merriweather", category: FontCategory.SERIF, family: "'Merriweather', serif" },
  { name: "Libre Baskerville", category: FontCategory.SERIF, family: "'Libre Baskerville', serif" },
  { name: "Inter", category: FontCategory.SANS_SERIF, family: "'Inter', sans-serif" },
  { name: "Montserrat", category: FontCategory.SANS_SERIF, family: "'Montserrat', sans-serif" },
  { name: "Poppins", category: FontCategory.SANS_SERIF, family: "'Poppins', sans-serif" },
  { name: "Great Vibes", category: FontCategory.SCRIPT, family: "'Great Vibes', cursive" },
  { name: "Dancing Script", category: FontCategory.SCRIPT, family: "'Dancing Script', cursive" },
  { name: "Parisienne", category: FontCategory.SCRIPT, family: "'Parisienne', cursive" },
  { name: "Alex Brush", category: FontCategory.SIGNATURE, family: "'Alex Brush', cursive" },
  { name: "Allura", category: FontCategory.SIGNATURE, family: "'Allura', cursive" },
  { name: "Pinyon Script", category: FontCategory.SIGNATURE, family: "'Pinyon Script', cursive" },
  { name: "Caveat", category: FontCategory.HANDWRITTEN, family: "'Caveat', cursive" },
  { name: "Shadows Into Light", category: FontCategory.HANDWRITTEN, family: "'Shadows Into Light', cursive" },
  { name: "Indie Flower", category: FontCategory.HANDWRITTEN, family: "'Indie Flower', cursive" },
  { name: "Oswald", category: FontCategory.BLOCK, family: "'Oswald', sans-serif" },
  { name: "Anton", category: FontCategory.BLOCK, family: "'Anton', sans-serif" },
  { name: "Bebas Neue", category: FontCategory.BLOCK, family: "'Bebas Neue', sans-serif" },
  { name: "Varsity Team", category: FontCategory.VARSITY, family: "'Varsity Team', sans-serif" },
  { name: "Collegiate", category: FontCategory.VARSITY, family: "'Collegiate', sans-serif" },
  { name: "Bungee", category: FontCategory.VARSITY, family: "'Bungee', sans-serif" },
  { name: "Cormorant Garamond", category: FontCategory.MONOGRAM, family: "'Cormorant Garamond', serif" },
  { name: "EB Garamond", category: FontCategory.MONOGRAM, family: "'EB Garamond', serif" },
  { name: "Marcellus", category: FontCategory.MONOGRAM, family: "'Marcellus', serif" },
];

const SYSTEM_PALETTES: { name: string; colors: { name: string; hex: string }[] }[] = [
  {
    name: "Foil Colors",
    colors: [
      { name: "Gold", hex: "#D4AF37" },
      { name: "Silver", hex: "#C0C0C0" },
      { name: "Rose Gold", hex: "#B76E79" },
    ],
  },
  {
    name: "Engraving Colors",
    colors: [
      { name: "Silver", hex: "#AEB2B6" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Dark Gray", hex: "#4A4A4A" },
    ],
  },
  {
    name: "Embroidery Threads",
    colors: [
      { name: "Black", hex: "#000000" },
      { name: "White", hex: "#FFFFFF" },
      { name: "Navy", hex: "#172A45" },
      { name: "Royal Blue", hex: "#1E3A8A" },
      { name: "Red", hex: "#B91C1C" },
      { name: "Gold", hex: "#D4AF37" },
    ],
  },
];

async function main() {
  for (const font of SYSTEM_FONTS) {
    const existing = await prisma.font.findFirst({
      where: { name: font.name, isSystem: true, shopId: null },
    });

    if (!existing) {
      await prisma.font.create({
        data: {
          name: font.name,
          category: font.category,
          family: font.family,
          isSystem: true,
          shopId: null,
        },
      });
    }
  }

  for (const palette of SYSTEM_PALETTES) {
    const existing = await prisma.colorPalette.findFirst({
      where: { name: palette.name, isSystem: true, shopId: null },
    });

    const paletteRecord =
      existing ??
      (await prisma.colorPalette.create({
        data: { name: palette.name, isSystem: true, shopId: null },
      }));

    for (const [index, color] of palette.colors.entries()) {
      const existingColor = await prisma.paletteColor.findFirst({
        where: { paletteId: paletteRecord.id, name: color.name },
      });

      if (!existingColor) {
        await prisma.paletteColor.create({
          data: {
            paletteId: paletteRecord.id,
            name: color.name,
            hex: color.hex,
            sortOrder: index,
          },
        });
      }
    }
  }

  console.log(
    `Seeded ${SYSTEM_FONTS.length} system fonts and ${SYSTEM_PALETTES.length} system color palettes.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
