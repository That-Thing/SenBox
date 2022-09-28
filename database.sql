-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 28, 2022 at 09:01 AM
-- Server version: 8.0.30-0ubuntu0.22.04.1
-- PHP Version: 8.1.2

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `senbox`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int NOT NULL,
  `username` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `group` int NOT NULL DEFAULT '2',
  `invite` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `invitedBy` int DEFAULT NULL,
  `joinDate` bigint DEFAULT NULL,
  `ip` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `banner` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `avatar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User avatar',
  `bio` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `twitter` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `website` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `location` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `invites` int DEFAULT NULL,
  `banned` int NOT NULL DEFAULT '0',
  `reason` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `discord_id` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `discord_avatar` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `discord_username` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `api_key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `username`, `email`, `password`, `token`, `group`, `invite`, `invitedBy`, `joinDate`, `ip`, `banner`, `avatar`, `bio`, `twitter`, `website`, `location`, `invites`, `banned`, `reason`, `discord_id`, `discord_avatar`, `discord_username`, `api_key`) VALUES
(36, 'test', 'test@test.com', 'n3NeDfmh3ccCvwoae4MDP59xU6AMKd6CztrcmVcomwU=', 'GJh8WsRyMuefJqvORGb7sZVsn7svIjEj/ANrQQYbEyc=', 4, NULL, NULL, 1664219137074, '::1', NULL, '/images/default.png', NULL, NULL, NULL, NULL, 1, 0, NULL, NULL, NULL, NULL, '042fb18f519e5a1d4e0f');

-- --------------------------------------------------------

--
-- Table structure for table `files`
--

CREATE TABLE `files` (
  `id` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` int NOT NULL,
  `date` bigint NOT NULL DEFAULT '0',
  `hash` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` bigint NOT NULL,
  `mime` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'File mimetype',
  `delete_key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invites`
--

CREATE TABLE `invites` (
  `invite` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `creator` int NOT NULL,
  `maxUses` int NOT NULL DEFAULT '1',
  `uses` int NOT NULL DEFAULT '0',
  `date` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pastes`
--

CREATE TABLE `pastes` (
  `id` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` int NOT NULL DEFAULT '0',
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `burn` tinyint NOT NULL DEFAULT '0',
  `syntax` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `date` bigint NOT NULL DEFAULT '0',
  `password` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `delete_key` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
