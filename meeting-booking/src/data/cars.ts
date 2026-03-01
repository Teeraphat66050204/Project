export type Car = {
  id: string;
  name: string;
  brand: string;
  type: "Sedan" | "SUV" | "Sport";
  pricePerDay: number;
  seats: number;
  gear: "Auto" | "Manual";
  fuel: "Petrol" | "Hybrid" | "Diesel" | "Electric";
  rating: number;
  image: string;
};

export const cars: Car[] = [
  {
    id: "porsche-911",
    name: "Porsche 911 Carrera",
    brand: "Porsche",
    type: "Sport",
    pricePerDay: 4900,
    seats: 2,
    gear: "Auto",
    fuel: "Petrol",
    rating: 4.9,
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg",
  },
  {
    id: "audi-a5",
    name: "Audi A5 Sportback",
    brand: "Audi",
    type: "Sedan",
    pricePerDay: 3600,
    seats: 4,
    gear: "Auto",
    fuel: "Hybrid",
    rating: 4.7,
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Audi_A5_B10_DSC_7314.jpg",
  },
  {
    id: "bmw-m4",
    name: "BMW M4 Coupe",
    brand: "BMW",
    type: "Sport",
    pricePerDay: 4300,
    seats: 4,
    gear: "Auto",
    fuel: "Petrol",
    rating: 4.8,
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e2/2021_BMW_M4_Competition_Automatic_3.0_Front.jpg",
  },
  {
    id: "mercedes-c",
    name: "Mercedes-Benz C-Class",
    brand: "Mercedes",
    type: "Sedan",
    pricePerDay: 3200,
    seats: 5,
    gear: "Auto",
    fuel: "Diesel",
    rating: 4.6,
    image: "https://upload.wikimedia.org/wikipedia/commons/b/be/Mercedes-Benz_W206_IMG_6380.jpg",
  },
  {
    id: "volvo-xc60",
    name: "Volvo XC60 Recharge",
    brand: "Volvo",
    type: "SUV",
    pricePerDay: 3400,
    seats: 5,
    gear: "Auto",
    fuel: "Hybrid",
    rating: 4.7,
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1a/2018_Volvo_XC60_R-Design_D5_P-Pulse_2.0_Front.jpg",
  },
  {
    id: "jaguar-f",
    name: "Jaguar F-Type",
    brand: "Jaguar",
    type: "Sport",
    pricePerDay: 4700,
    seats: 2,
    gear: "Auto",
    fuel: "Petrol",
    rating: 4.8,
    image: "https://upload.wikimedia.org/wikipedia/commons/d/d5/2017_Jaguar_F-Type_V6_R-Dynamic_Automatic_3.0_Front.jpg",
  },
  {
    id: "honda-crv",
    name: "Honda CR-V",
    brand: "Honda",
    type: "SUV",
    pricePerDay: 2400,
    seats: 5,
    gear: "Auto",
    fuel: "Hybrid",
    rating: 4.5,
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Honda_CR-V_e-HEV_Elegance_AWD_%28VI%29_%E2%80%93_f_14072024.jpg",
  },
  {
    id: "toyota-camry",
    name: "Toyota Camry",
    brand: "Toyota",
    type: "Sedan",
    pricePerDay: 2200,
    seats: 5,
    gear: "Auto",
    fuel: "Hybrid",
    rating: 4.4,
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ac/2018_Toyota_Camry_%28ASV70R%29_Ascent_sedan_%282018-08-27%29_01.jpg",
  },
  {
    id: "nissan-gtr",
    name: "Nissan GT-R",
    brand: "Nissan",
    type: "Sport",
    pricePerDay: 5200,
    seats: 4,
    gear: "Auto",
    fuel: "Petrol",
    rating: 4.9,
    image: "https://upload.wikimedia.org/wikipedia/commons/e/ef/2009-2010_Nissan_GT-R_%28R35%29_coupe_01.jpg",
  },
  {
    id: "acura-mdx",
    name: "Acura MDX",
    brand: "Acura",
    type: "SUV",
    pricePerDay: 3000,
    seats: 7,
    gear: "Auto",
    fuel: "Petrol",
    rating: 4.6,
    image: "https://upload.wikimedia.org/wikipedia/commons/5/5b/2022_Acura_MDX_Technology%2C_front_7.2.22.jpg",
  },
];

export function getCarById(id: string): Car | undefined {
  return cars.find((car) => car.id === id);
}
